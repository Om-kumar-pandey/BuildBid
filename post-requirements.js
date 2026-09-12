document.addEventListener("DOMContentLoaded", () => {
  initDateListeners();
  updateSidebarSummary(); // Initial load par 0 Pros & ₹0 estimate render karega
});

let currentHireStep = 1;

// Global State strictly conforming to PDF Section 3 Spring Boot Payload
const hireState = {
  projectTitle: "",
  projectCategory: "Home Maintenance",
  location: "",
  startDate: "",
  endDate: "",
  description: "",
  requestedProfessionals: [], // Khali array jab tak user khud add na kare
  logistics: {
    materialsProvidedBy: "Customer",
    toolsProvidedBy: "Professional",
    siteCondition: "Occupied"
  }
};

const AVAILABLE_ROLES = [
  "Electrician",
  "Plumber",
  "Mason",
  "Labour",
  "Interior Designer",
  "Architect",
  "Painter",
  "Gardener",
  "Other"
];

/* =========================================================
   STEP 1: CATEGORY SELECTION
   ========================================================= */
function selectHireCategory(categoryName, elem) {
  hireState.projectCategory = categoryName;
  document.querySelectorAll(".category-box").forEach(c => c.classList.remove("selected"));
  if (elem) elem.classList.add("selected");
  updateSidebarSummary();
}

/* =========================================================
   STEP 2: DYNAMIC DURATION (DATES CALCULATION)
   ========================================================= */
function initDateListeners() {
  const startInput = document.getElementById("hireStartDate");
  const endInput = document.getElementById("hireEndDate");

  if (startInput) {
    const today = new Date().toISOString().split("T")[0];
    startInput.min = today;
  }

  if (startInput && endInput) {
    startInput.addEventListener("change", () => {
      endInput.min = startInput.value;
      if (endInput.value && endInput.value < startInput.value) {
        endInput.value = startInput.value;
      }
      updateSidebarSummary();
    });

    endInput.addEventListener("change", () => {
      updateSidebarSummary();
    });
  }
}

function calculateProjectDays() {
  const startDateVal = document.getElementById("hireStartDate")?.value;
  const endDateVal = document.getElementById("hireEndDate")?.value;

  if (!startDateVal) return 1;
  if (!endDateVal) return 1;

  const start = new Date(startDateVal);
  const end = new Date(endDateVal);

  if (end < start) return 1;

  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 1;
}

/* =========================================================
   STEP 3: DYNAMIC CREW ROW GENERATION (ON-DEMAND ONLY)
   ========================================================= */
function addProfessionalRow(role = "Labour", quantity = 1, offerAmount = 500, offerType = "Per Day", customRole = "") {
  const tbody = document.getElementById("crewTableBody");
  if (!tbody) return;

  // Pehli baar row add hone par empty message hatao
  const emptyRow = document.getElementById("emptyCrewRow");
  if (emptyRow) emptyRow.remove();

  const rowId = "role_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

  const proItem = {
    id: rowId,
    role: role,
    customRole: customRole || null,
    quantity: parseInt(quantity) || 1,
    offerAmount: parseFloat(offerAmount) || 0,
    offerType: offerType
  };

  hireState.requestedProfessionals.push(proItem);

  const tr = document.createElement("tr");
  tr.id = rowId;

  tr.innerHTML = `
    <td>
      <select class="form-control" onchange="handleRoleDropdownChange('${rowId}', this.value)">
        ${AVAILABLE_ROLES.map(r => `<option value="${r}" ${r === role ? 'selected' : ''}>${r}</option>`).join('')}
      </select>
    </td>
    <td>
      <input 
        type="text" 
        id="customInput_${rowId}" 
        class="form-control" 
        placeholder="Specify custom role..." 
        value="${customRole || ''}"
        style="display: ${role === 'Other' ? 'block' : 'none'};"
        oninput="handleCustomRoleInput('${rowId}', this.value)"
      />
    </td>
    <td>
      <div class="qty-pill-control">
        <button type="button" class="qty-btn-sub" onclick="adjustCrewQty('${rowId}', -1)">-</button>
        <span class="qty-num-val" id="qtyText_${rowId}">${quantity}</span>
        <button type="button" class="qty-btn-sub" onclick="adjustCrewQty('${rowId}', 1)">+</button>
      </div>
    </td>
    <td>
      <div class="budget-composite-input">
        <input 
          type="number" 
          placeholder="₹ Rate" 
          value="${offerAmount}" 
          min="0" 
          oninput="handleBudgetChange('${rowId}', this.value)"
        />
        <select onchange="handleOfferTypeChange('${rowId}', this.value)">
          <option value="Per Day" ${offerType === 'Per Day' ? 'selected' : ''}>Per Day</option>
          <option value="Per Sq.Ft" ${offerType === 'Per Sq.Ft' ? 'selected' : ''}>Per Sq.Ft</option>
          <option value="Lump Sum" ${offerType === 'Lump Sum' ? 'selected' : ''}>Lump Sum</option>
        </select>
      </div>
    </td>
    <td style="text-align: center;">
      <button type="button" class="btn-remove-row" onclick="removeProfessionalRow('${rowId}')">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </td>
  `;

  tbody.appendChild(tr);
  updateSidebarSummary();
}

function handleRoleDropdownChange(rowId, selectedRole) {
  const item = hireState.requestedProfessionals.find(p => p.id === rowId);
  if (!item) return;

  item.role = selectedRole;
  const customInput = document.getElementById(`customInput_${rowId}`);

  if (selectedRole === "Other") {
    customInput.style.display = "block";
    customInput.focus();
    item.customRole = customInput.value.trim() || "Specialist";
  } else {
    customInput.style.display = "none";
    item.customRole = null;
  }
  updateSidebarSummary();
}

function handleCustomRoleInput(rowId, val) {
  const item = hireState.requestedProfessionals.find(p => p.id === rowId);
  if (item) {
    item.customRole = val.trim();
    updateSidebarSummary();
  }
}

function adjustCrewQty(rowId, delta) {
  const item = hireState.requestedProfessionals.find(p => p.id === rowId);
  if (!item) return;

  item.quantity = Math.max(1, item.quantity + delta);
  const qtyElem = document.getElementById(`qtyText_${rowId}`);
  if (qtyElem) qtyElem.textContent = item.quantity;
  updateSidebarSummary();
}

function handleBudgetChange(rowId, val) {
  const item = hireState.requestedProfessionals.find(p => p.id === rowId);
  if (item) {
    item.offerAmount = parseFloat(val) || 0;
    updateSidebarSummary();
  }
}

function handleOfferTypeChange(rowId, val) {
  const item = hireState.requestedProfessionals.find(p => p.id === rowId);
  if (item) {
    item.offerType = val;
    updateSidebarSummary();
  }
}

function removeProfessionalRow(rowId) {
  hireState.requestedProfessionals = hireState.requestedProfessionals.filter(p => p.id !== rowId);
  document.getElementById(rowId)?.remove();

  // Agar saari rows delete ho gayi hain toh table me placeholder dikhao
  const tbody = document.getElementById("crewTableBody");
  if (tbody && hireState.requestedProfessionals.length === 0) {
    tbody.innerHTML = `
      <tr id="emptyCrewRow">
        <td colspan="5" style="text-align: center; color: #94a3b8; padding: 24px; font-style: italic;">
          No professionals added yet. Click "+ Add Professional" to build your crew.
        </td>
      </tr>
    `;
  }

  updateSidebarSummary();
}

/* =========================================================
   REAL-TIME CART & SIDEBAR ESTIMATE ENGINE
   ========================================================= */
function updateSidebarSummary() {
  hireState.projectTitle = document.getElementById("hireTitleInput")?.value.trim() || "";
  hireState.location = document.getElementById("hireAddressInput")?.value.trim() || "";
  hireState.startDate = document.getElementById("hireStartDate")?.value || "";
  hireState.endDate = document.getElementById("hireEndDate")?.value || "";
  hireState.description = document.getElementById("hireDescriptionInput")?.value.trim() || "";

  hireState.logistics.materialsProvidedBy = document.querySelector('input[name="materialsProvidedBy"]:checked')?.value || "Customer";
  hireState.logistics.toolsProvidedBy = document.querySelector('input[name="toolsProvidedBy"]:checked')?.value || "Professional";
  hireState.logistics.siteCondition = document.querySelector('input[name="siteCondition"]:checked')?.value || "Occupied";

  const totalDays = calculateProjectDays();

  // Total Pros Count
  const totalPros = hireState.requestedProfessionals.reduce((sum, p) => sum + p.quantity, 0);
  const totalProsEl = document.getElementById("cartTotalPros");
  if (totalProsEl) totalProsEl.textContent = `${totalPros} Pro${totalPros !== 1 ? 's' : ''}`;

  // Location Display
  const locEl = document.getElementById("cartLocationText");
  if (locEl) locEl.textContent = hireState.location || "Not specified";

  // Timeline Display
  const dateEl = document.getElementById("cartDatesText");
  if (dateEl) {
    if (hireState.startDate) {
      dateEl.textContent = hireState.endDate ? `${totalDays} Days (${hireState.startDate} to ${hireState.endDate})` : `${hireState.startDate} (1 Day)`;
    } else {
      dateEl.textContent = "Immediate / Flexible";
    }
  }

  // Cart Role List & Grand Total Calculation
  let grandTotalEstimate = 0;
  const roleListEl = document.getElementById("cartRoleList");

  if (roleListEl) {
    if (hireState.requestedProfessionals.length === 0) {
      roleListEl.innerHTML = `<p class="empty-cart-msg">No roles added yet. Click "+ Add Professional".</p>`;
    } else {
      roleListEl.innerHTML = hireState.requestedProfessionals.map(p => {
        const displayName = p.role === "Other" ? (p.customRole || "Other Specialist") : p.role;
        let lineTotal = 0;
        let detailText = "";

        if (p.offerType === "Per Day") {
          lineTotal = p.quantity * p.offerAmount * totalDays;
          detailText = `₹${p.offerAmount}/day × ${totalDays}d`;
        } else {
          lineTotal = p.quantity * p.offerAmount;
          detailText = `₹${p.offerAmount} (${p.offerType})`;
        }

        grandTotalEstimate += lineTotal;

        return `
          <div class="cart-role-chip" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div>
              <strong style="color:#0f172a;">${p.quantity}x</strong> ${displayName}
              <small style="display: block; color: #64748b; font-size: 10.5px;">${detailText}</small>
            </div>
            <span style="font-weight: 700; color: #0284c7;">₹${lineTotal.toLocaleString('en-IN')}</span>
          </div>
        `;
      }).join('');
    }
  }

  // Grand Total Display
  const totalDisplay = document.getElementById("cartTotalEstimate");
  if (totalDisplay) {
    totalDisplay.textContent = `₹${grandTotalEstimate.toLocaleString('en-IN')}`;
  }
}

/* =========================================================
   STEP NAVIGATION & VALIDATION
   ========================================================= */
function markInvalidField(el, msg) {
  if (!el) return;
  el.style.borderColor = "#ef4444";
  el.focus();
  const clear = () => { el.style.borderColor = ""; el.removeEventListener("input", clear); };
  el.addEventListener("input", clear);
  showToast(msg, "error");
}

function validateHireStep(step) {
  if (step === 2) {
    const title = document.getElementById("hireTitleInput");
    if (!title || !title.value.trim()) {
      markInvalidField(title, "Please enter a Project Title *");
      return false;
    }

    const addr = document.getElementById("hireAddressInput");
    if (!addr || !addr.value.trim()) {
      markInvalidField(addr, "Please specify Service Address / Locality *");
      return false;
    }

    const start = document.getElementById("hireStartDate");
    if (!start || !start.value) {
      markInvalidField(start, "Please pick a Project Start Date *");
      return false;
    }

    const desc = document.getElementById("hireDescriptionInput");
    if (!desc || !desc.value.trim()) {
      markInvalidField(desc, "Please describe the required work scope *");
      return false;
    }
  }

  if (step === 3) {
    if (hireState.requestedProfessionals.length === 0) {
      showToast("Please add at least 1 professional to your crew *", "error");
      return false;
    }

    for (const p of hireState.requestedProfessionals) {
      if (p.role === "Other" && (!p.customRole || p.customRole.trim() === "")) {
        const inp = document.getElementById(`customInput_${p.id}`);
        markInvalidField(inp, "Please type the specific role for 'Other' *");
        return false;
      }
      if (p.offerAmount <= 0) {
        showToast(`Please enter a valid budget offer for ${p.role} *`, "error");
        return false;
      }
    }
  }

  return true;
}

function goToHireStep(step) {
  if (step > currentHireStep) {
    if (!validateHireStep(currentHireStep)) return;
  }

  currentHireStep = step;

  for (let i = 1; i <= 5; i++) {
    const pane = document.getElementById(`hireStep${i}`);
    if (pane) pane.classList.toggle("active", i === currentHireStep);
  }

  document.querySelectorAll(".step-item").forEach(n => {
    const s = parseInt(n.dataset.step);
    n.classList.toggle("active", s === currentHireStep);
    n.classList.toggle("completed", s < currentHireStep);
  });

  if (currentHireStep === 5) populateReviewStep();
  window.scrollTo({ top: 80, behavior: "smooth" });
}

function populateReviewStep() {
  const totalDays = calculateProjectDays();

  document.getElementById("revCategory").textContent = hireState.projectCategory;
  document.getElementById("revTitle").textContent = hireState.projectTitle;
  document.getElementById("revLocation").textContent = hireState.location;
  document.getElementById("revDate").textContent = hireState.startDate + (hireState.endDate ? ` to ${hireState.endDate} (${totalDays} Days)` : ` (1 Day)`);
  document.getElementById("revDesc").textContent = hireState.description;
  document.getElementById("revLogistics").textContent = `Materials: ${hireState.logistics.materialsProvidedBy} | Tools: ${hireState.logistics.toolsProvidedBy} | Site: ${hireState.logistics.siteCondition}`;

  const crewList = document.getElementById("revCrewList");
  if (crewList) {
    crewList.innerHTML = hireState.requestedProfessionals.map(p => {
      const lineCost = p.offerType === "Per Day" ? (p.quantity * p.offerAmount * totalDays) : (p.quantity * p.offerAmount);
      return `
        <div class="review-crew-pill" style="display:flex; justify-content:space-between; margin-bottom:8px; padding:10px; background:#ffffff; border:1px solid #e2e8f0; border-radius:6px;">
          <div>
            <strong>${p.quantity}x</strong> ${p.role === 'Other' ? p.customRole : p.role}
            <span style="color:#64748b; font-size:11.5px; margin-left:8px;">(₹${p.offerAmount}/${p.offerType})</span>
          </div>
          <span style="font-weight:700; color:#0284c7;">₹${lineCost.toLocaleString('en-IN')} Total</span>
        </div>
      `;
    }).join('');
  }
}

/* =========================================================
   SUBMIT SPRING BOOT PAYLOAD
   ========================================================= */
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

async function submitHireRequirement() {
  const token = getCleanToken();
  if (!token) {
    alert("Authentication required. Please login as a customer to post your requirements.");
    window.location.href = "index.html";
    return;
  }

  const payload = {
    projectId: "HIRE-" + Date.now(),
    projectTitle: hireState.projectTitle || "Hiring Requirement",
    projectType: hireState.projectCategory || "Home Maintenance",
    projectCategory: hireState.projectCategory || "Home Maintenance",
    location: hireState.location,
    startDate: hireState.startDate,
    targetStartDate: hireState.startDate,
    description: hireState.description,
    requestedProfessionals: hireState.requestedProfessionals.map(p => ({
      role: p.role,
      customRole: p.role === "Other" ? p.customRole : null,
      quantity: p.quantity,
      offerAmount: p.offerAmount,
      offerType: p.offerType
    })),
    logistics: {
      materialsProvidedBy: hireState.logistics.materialsProvidedBy,
      toolsProvidedBy: hireState.logistics.toolsProvidedBy,
      siteCondition: hireState.logistics.siteCondition
    }
  };

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/customer/hiring/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const respData = await res.json().catch(() => ({}));
      payload.id = respData.projectId || ("HIRE-" + Date.now());
      saveLocalHireProject(payload);
      alert("Hiring requirement posted and saved to Cloud MySQL successfully! Trade professionals are now notified.");
      window.location.href = "customer projects.html";
      return;
    } else {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error || errData.message || `Server error (${res.status})`;
      console.error("Backend Error:", res.status, errMsg);
      alert("Error saving requirement: " + errMsg);
    }
  } catch (err) {
    console.error("Failed to reach server:", err);
    alert("Network Error: Could not connect to the backend server.");
  }
}

function saveLocalHireProject(p) {
  const list = JSON.parse(localStorage.getItem("customerHireRequests") || "[]");
  list.unshift({
    id: "HIRE-" + Date.now(),
    ...p,
    status: "OPEN FOR BIDS",
    postedDate: "Just now"
  });
  localStorage.setItem("customerHireRequests", JSON.stringify(list));
}

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