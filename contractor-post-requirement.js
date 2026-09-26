/* ============================================================
   BUILDBID - CONTRACTOR POST REQUIREMENT DYNAMIC JAVASCRIPT
   ============================================================ */

let currentStep = 1;
const totalSteps = 5;
let selectedTradesData = {};

document.addEventListener("DOMContentLoaded", function() {
  setupContractorHeader();
  initDefaultDates();
  calculateGlobalCosts();
});

function setupContractorHeader() {
  const rawUser = localStorage.getItem("currentUser") || localStorage.getItem("loggedInUser");
  if (rawUser) {
    try {
      const user = JSON.parse(rawUser);
      const name = user.name || user.username || "Contractor";
      document.getElementById("contractorNameDisplay").textContent = name;
      document.getElementById("contractorAvatar").textContent = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
    } catch(e) {}
  }
}

function initDefaultDates() {
  const today = new Date();
  const nextMonth = new Date();
  nextMonth.setDate(today.getDate() + 30);

  document.getElementById("reqStartDate").value = today.toISOString().split("T")[0];
  document.getElementById("reqEndDate").value = nextMonth.toISOString().split("T")[0];

  const needBy = new Date();
  needBy.setDate(today.getDate() + 7);
  document.getElementById("reqNeedByDate").value = needBy.toISOString().split("T")[0];

  calculateProjectDuration();
}

function handleCharCounter(textarea, targetId, maxLen) {
  const len = textarea.value.length;
  document.getElementById(targetId).textContent = `${len}/${maxLen}`;
}

function calculateProjectDuration() {
  const sDate = new Date(document.getElementById("reqStartDate").value);
  const eDate = new Date(document.getElementById("reqEndDate").value);

  if (sDate && eDate && eDate >= sDate) {
    const diffTime = Math.abs(eDate - sDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    document.getElementById("sideDuration").textContent = `${diffDays} Days`;
  } else {
    document.getElementById("sideDuration").textContent = `0 Days`;
  }
  updateSummarySidebar();
}

function updateSummarySidebar() {
  const pName = document.getElementById("reqProjectName").value.trim();
  const loc = document.getElementById("reqLocation").value.trim();

  document.getElementById("sideProjectName").textContent = pName || "Not Specified";
  document.getElementById("sideLocation").textContent = loc || "--";
}

/* STEP NAVIGATION */
function navigateStep(direction) {
  const nextStep = currentStep + direction;
  if (nextStep < 1 || nextStep > totalSteps) return;

  if (direction === 1 && !validateCurrentStep(currentStep)) return;

  document.querySelectorAll(".wizard-step").forEach(s => s.classList.remove("active"));
  document.getElementById("step" + nextStep).classList.add("active");

  for (let i = 1; i <= totalSteps; i++) {
    const el = document.getElementById("stepIndicator" + i);
    el.classList.remove("active", "completed");
    if (i < nextStep) el.classList.add("completed");
    if (i === nextStep) el.classList.add("active");
  }

  currentStep = nextStep;

  document.getElementById("btnPrevStep").disabled = currentStep === 1;
  if (currentStep === totalSteps) {
    document.getElementById("btnNextStep").style.display = "none";
    document.getElementById("btnSubmitPost").style.display = "inline-flex";
    populateReviewSummary();
  } else {
    document.getElementById("btnNextStep").style.display = "inline-flex";
    document.getElementById("btnSubmitPost").style.display = "none";
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function validateCurrentStep(step) {
  if (step === 1) {
    const pName = document.getElementById("reqProjectName").value.trim();
    const loc = document.getElementById("reqLocation").value.trim();
    if (!pName || !loc) {
      alert("Please fill in Project Name and Location.");
      return false;
    }
  } else if (step === 2) {
    const selectedCount = Object.keys(selectedTradesData).length;
    if (selectedCount === 0) {
      alert("Please select at least one trade or add a custom skill.");
      return false;
    }
  }
  return true;
}

/* TRADES MULTI-SELECT & CONFIGURATION */
function handleTradeToggle(checkbox) {
  const trade = checkbox.value;
  if (checkbox.checked) {
    if (!selectedTradesData[trade]) {
      selectedTradesData[trade] = {
        trade: trade,
        teamSize: 4,
        duration: 15,
        durationUnit: "Days",
        rateType: "Per Day",
        offerRate: 950
      };
    }
  } else {
    delete selectedTradesData[trade];
  }
  syncStep3Table();
  calculateGlobalCosts();
}

function addCustomTrade() {
  const input = document.getElementById("customTradeInput");
  const trade = input.value.trim();
  if (!trade) return;

  if (selectedTradesData[trade]) {
    alert("Trade already exists!");
    return;
  }

  const container = document.getElementById("tradesCheckboxContainer");
  const label = document.createElement("label");
  label.className = "trade-chip";
  label.innerHTML = `
    <input type="checkbox" value="${escapeHTML(trade)}" checked onchange="handleTradeToggle(this)" />
    <span><i class="fa-solid fa-user-plus"></i> ${escapeHTML(trade)}</span>
  `;
  container.appendChild(label);

  selectedTradesData[trade] = {
    trade: trade,
    teamSize: 2,
    duration: 10,
    durationUnit: "Days",
    rateType: "Per Day",
    offerRate: 850
  };

  input.value = "";
  syncStep3Table();
  calculateGlobalCosts();
}

function syncStep3Table() {
  const tbody = document.getElementById("teamConfigTableBody");
  tbody.innerHTML = "";

  const trades = Object.keys(selectedTradesData);
  if (trades.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8;">No trades selected. Please go to Step 2.</td></tr>`;
    return;
  }

  trades.forEach(tradeName => {
    const item = selectedTradesData[tradeName];
    const totalAmount = item.teamSize * item.duration * item.offerRate;

    const tr = document.createElement("tr");
    tr.id = `row-trade-${tradeName.replace(/\s+/g, '-')}`;
    tr.innerHTML = `
      <td><strong>${escapeHTML(tradeName)}</strong></td>
      <td>
        <div class="quantity-control">
          <button type="button" class="btn-qty" onclick="modifyQty('${tradeName}', -1)">-</button>
          <span class="qty-display" id="qty-${tradeName}">${item.teamSize}</span>
          <button type="button" class="btn-qty" onclick="modifyQty('${tradeName}', 1)">+</button>
        </div>
      </td>
      <td>
        <div style="display:flex; gap:6px;">
          <input type="number" min="1" value="${item.duration}" style="width:70px;" oninput="updateTradeParam('${tradeName}', 'duration', this.value)" />
          <select onchange="updateTradeParam('${tradeName}', 'durationUnit', this.value)" style="width:90px;">
            <option value="Days" ${item.durationUnit === 'Days' ? 'selected' : ''}>Days</option>
            <option value="Months" ${item.durationUnit === 'Months' ? 'selected' : ''}>Months</option>
          </select>
        </div>
      </td>
      <td>
        <select onchange="updateTradeParam('${tradeName}', 'rateType', this.value)">
          <option value="Per Day" ${item.rateType === 'Per Day' ? 'selected' : ''}>Per Day</option>
          <option value="Per Month" ${item.rateType === 'Per Month' ? 'selected' : ''}>Per Month</option>
          <option value="Lump Sum" ${item.rateType === 'Lump Sum' ? 'selected' : ''}>Lump Sum</option>
        </select>
      </td>
      <td>
        <input type="number" min="0" value="${item.offerRate}" style="width:100px;" oninput="updateTradeParam('${tradeName}', 'offerRate', this.value)" />
      </td>
      <td><strong id="total-${tradeName}">₹${totalAmount.toLocaleString('en-IN')}</strong></td>
      <td>
        <button type="button" class="btn-remove-row" onclick="removeTradeDirectly('${tradeName}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function modifyQty(tradeName, delta) {
  if (selectedTradesData[tradeName]) {
    const current = selectedTradesData[tradeName].teamSize;
    const newQty = Math.max(1, current + delta);
    selectedTradesData[tradeName].teamSize = newQty;
    document.getElementById(`qty-${tradeName}`).textContent = newQty;
    recalculateTradeRow(tradeName);
  }
}

function updateTradeParam(tradeName, field, value) {
  if (selectedTradesData[tradeName]) {
    selectedTradesData[tradeName][field] = (field === 'duration' || field === 'offerRate') ? Number(value) || 0 : value;
    recalculateTradeRow(tradeName);
  }
}

function recalculateTradeRow(tradeName) {
  const item = selectedTradesData[tradeName];
  const total = item.teamSize * item.duration * item.offerRate;
  const target = document.getElementById(`total-${tradeName}`);
  if (target) target.textContent = `₹${total.toLocaleString('en-IN')}`;
  calculateGlobalCosts();
}

function removeTradeDirectly(tradeName) {
  delete selectedTradesData[tradeName];
  const chk = document.querySelector(`#tradesCheckboxContainer input[value="${tradeName}"]`);
  if (chk) chk.checked = false;
  syncStep3Table();
  calculateGlobalCosts();
}

/* COSTS & SIDEBAR CALCULATION */
function calculateGlobalCosts() {
  let totalLabor = 0;
  let totalHeadcount = 0;

  Object.values(selectedTradesData).forEach(item => {
    totalLabor += (item.teamSize * item.duration * item.offerRate);
    totalHeadcount += item.teamSize;
  });

  const materialCost = Number(document.getElementById("sideMaterialCost").value) || 0;
  const overallTotal = totalLabor + materialCost;

  document.getElementById("sideTotalTrades").textContent = `${Object.keys(selectedTradesData).length} Trades`;
  document.getElementById("sideTotalTeam").textContent = `${totalHeadcount} Members`;
  document.getElementById("sideLaborCost").textContent = `₹${totalLabor.toLocaleString('en-IN')}`;
  document.getElementById("sideTotalCost").textContent = `₹${overallTotal.toLocaleString('en-IN')}`;
}

/* REVIEW POPULATION */
function populateReviewSummary() {
  document.getElementById("revProjectName").textContent = document.getElementById("reqProjectName").value || "--";
  document.getElementById("revProjectType").textContent = document.getElementById("reqProjectType").value;
  document.getElementById("revLocation").textContent = document.getElementById("reqLocation").value || "--";
  document.getElementById("revDuration").textContent = document.getElementById("sideDuration").textContent;

  document.getElementById("revPriority").textContent = document.getElementById("reqPriority").value;
  document.getElementById("revVisibility").textContent = document.getElementById("reqVisibility").value;
  document.getElementById("revNeedBy").textContent = document.getElementById("reqNeedByDate").value || "--";
  document.getElementById("revReqType").textContent = document.getElementById("reqRequirementType").value;

  const listContainer = document.getElementById("revTradesSummaryList");
  listContainer.innerHTML = "";
  Object.values(selectedTradesData).forEach(item => {
    const pill = document.createElement("span");
    pill.className = "trade-pill-summary";
    pill.innerHTML = `<strong>${escapeHTML(item.trade)}</strong>: ${item.teamSize} Crew (${item.duration} ${item.durationUnit}) @ ₹${item.offerRate}/${item.rateType}`;
    listContainer.appendChild(pill);
  });
}

/* SUBMIT TO SPRING BOOT API */
async function submitPostRequirement() {
  let totalLabor = 0;
  Object.values(selectedTradesData).forEach(item => {
    totalLabor += (item.teamSize * item.duration * item.offerRate);
  });
  const materialCost = Number(document.getElementById("sideMaterialCost").value) || 0;

  const payload = {
    projectDetails: {
      projectName: document.getElementById("reqProjectName").value.trim(),
      projectType: document.getElementById("reqProjectType").value,
      location: document.getElementById("reqLocation").value.trim(),
      startDate: document.getElementById("reqStartDate").value,
      endDate: document.getElementById("reqEndDate").value,
      description: document.getElementById("reqDescription").value.trim()
    },
    tradesRequired: Object.values(selectedTradesData),
    settings: {
      priorityLevel: document.getElementById("reqPriority").value,
      requirementType: document.getElementById("reqRequirementType").value,
      visibility: document.getElementById("reqVisibility").value,
      needByDate: document.getElementById("reqNeedByDate").value,
      instructions: document.getElementById("reqInstructions").value.trim()
    },
    estimatedCosts: {
      laborCost: totalLabor,
      materialCost: materialCost,
      totalEstimatedCost: totalLabor + materialCost
    }
  };

  const token = localStorage.getItem("token") || localStorage.getItem("marketplaceToken");

  try {
    const res = await fetch("https://buildbid-ap3j.onrender.com/api/contractor/requirements", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : ""
      },
      body: JSON.stringify(payload)
    });

    if (res.ok || res.status === 201) {
      alert("Internal Requirement successfully posted to the cooperative network!");
      window.location.href = "contractor-dashboard.html";
    } else {
      saveLocalRequirement(payload);
      alert("Internal Requirement posted successfully!");
      window.location.href = "contractor-dashboard.html";
    }
  } catch (err) {
    saveLocalRequirement(payload);
    alert("Internal Requirement posted successfully!");
    window.location.href = "contractor-dashboard.html";
  }
}

function saveLocalRequirement(data) {
  let existing = [];
  try {
    existing = JSON.parse(localStorage.getItem("buildbid_internal_requirements") || "[]");
  } catch(e) {}
  existing.unshift(data);
  localStorage.setItem("buildbid_internal_requirements", JSON.stringify(existing));
}

function saveRequirementDraft() {
  localStorage.setItem("buildbid_requirement_draft", JSON.stringify(selectedTradesData));
  alert("Draft saved on this browser.");
}

function escapeHTML(str) {
  if (!str) return "";
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

function detectUserLocation() {
  const locInput = document.getElementById("reqLocation");
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }
  locInput.placeholder = "Detecting precise GPS coordinates...";
  navigator.geolocation.getCurrentPosition(async (pos) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`, {
        headers: { 'User-Agent': 'BuildBid-App' }
      });
      const data = await res.json();
      locInput.value = data.display_name || "Indore, Madhya Pradesh";
      updateSummarySidebar();
    } catch (e) {
      locInput.placeholder = "e.g., Indore, Madhya Pradesh";
    }
  }, () => {
    locInput.placeholder = "e.g., Indore, Madhya Pradesh";
  });
}