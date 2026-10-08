/* ==========================================================================
   BUILDBID — DIRECT BUY MATERIAL ENGINE (direct-buy-material.js)
   BILINGUAL (ENGLISH + HINDI) DIRECT INVENTORY PURCHASING FLOW
   ========================================================================== */

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

// In-memory state
let availableMaterials = [];
let selectedSellerData = null;
let currentSearchPayload = null;

document.addEventListener("DOMContentLoaded", async function() {
  setupUserHeader();
  loadStatesDropdown();
  await loadAvailableMaterials();

  const searchForm = document.getElementById("directSearchForm");
  if (searchForm) {
    searchForm.addEventListener("submit", handleProceedSearch);
  }

  const matSelect = document.getElementById("directMaterialSelect");
  if (matSelect) {
    matSelect.addEventListener("change", handleMaterialSelectionChange);
  }
});

function setupUserHeader() {
  const user = getCurrentUser();
  const userPill = document.getElementById("userPill");
  const backBtn = document.getElementById("backToDashboardBtn");

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

    const contactInput = document.getElementById("directContactPerson");
    const phoneInput = document.getElementById("directContactPhone");
    if (contactInput && !contactInput.value) contactInput.value = user.name || user.fullName || "";
    if (phoneInput && !phoneInput.value && user.phone) phoneInput.value = user.phone;
  }
}

function loadStatesDropdown() {
  const select = document.getElementById("directState");
  if (!select) return;

  select.innerHTML = '<option value="" disabled>-- Select State / राज्य चुनें --</option>';
  INDIAN_STATES.forEach(st => {
    const opt = document.createElement("option");
    opt.value = st;
    opt.textContent = st;
    if (st === "Uttar Pradesh") opt.selected = true;
    select.appendChild(opt);
  });
}

/**
 * Fetch available materials from active seller inventory
 */
async function loadAvailableMaterials() {
  const select = document.getElementById("directMaterialSelect");
  if (!select) return;

  try {
    const token = getCleanToken();
    const headers = { "Accept": "application/json" };
    if (token) {
      headers["Authorization"] = "Bearer " + token;
    }

    const res = await fetch(API_BASE_URL + "/api/direct-buy/materials", { headers });
    if (res.ok) {
      const data = await res.json();
      let rawList = [];
      if (Array.isArray(data)) {
        rawList = data;
      } else if (data && Array.isArray(data.materials)) {
        rawList = data.materials;
      } else if (data && Array.isArray(data.data)) {
        rawList = data.data;
      }

      availableMaterials = [];
      const seen = new Set();
      rawList.forEach(item => {
        let name = "";
        let unit = "Units";
        let isOther = false;
        let typicalPrice = 0;

        if (typeof item === "string") {
          name = item.trim();
          isOther = name.toLowerCase().includes("other") || name.includes("अन्य");
        } else if (item && typeof item === "object") {
          name = (item.name || item.materialName || "").toString().trim();
          unit = (item.unit || "Units").toString().trim();
          isOther = Boolean(item.isOther) || name.toLowerCase().includes("other") || name.includes("अन्य");
          typicalPrice = item.typicalPrice || 0;
        }

        if (!name || isOther) return;

        const key = name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          availableMaterials.push({
            name: name,
            unit: unit,
            isOther: false,
            typicalPrice: typicalPrice
          });
        }
      });

      // Always ensure "Other — अन्य" is present at the end of the catalog
      availableMaterials.push({
        name: "Other — अन्य",
        unit: "Units",
        isOther: true,
        typicalPrice: 0
      });

      select.innerHTML = '<option value="" disabled selected>-- Select a material from seller inventory — सामग्री चुनें --</option>';
      availableMaterials.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m.name;
        opt.textContent = m.name;
        opt.dataset.unit = m.unit || "Units";
        opt.dataset.isOther = m.isOther ? "true" : "false";
        opt.dataset.typicalPrice = m.typicalPrice || "0";
        select.appendChild(opt);
      });
    } else {
      console.error("Direct Buy Materials API failed:", res.status, res.statusText);
      select.innerHTML = '<option value="" disabled>Unable to load materials. Please try again. — सामग्री लोड करने में असमर्थ</option>';
    }
  } catch (err) {
    console.error("Could not fetch available materials from backend:", err);
    select.innerHTML = '<option value="" disabled>Unable to load materials. Please try again. — सामग्री लोड करने में असमर्थ</option>';
  }
}

function handleMaterialSelectionChange() {
  const select = document.getElementById("directMaterialSelect");
  const unitBadge = document.getElementById("directUnitBadge");
  const customBox = document.getElementById("directCustomMaterialBox");
  const customNameInput = document.getElementById("directCustomName");
  if (!select) return;

  const selectedOpt = select.options[select.selectedIndex];
  if (!selectedOpt) return;

  const isOther = selectedOpt.dataset.isOther === "true" || selectedOpt.value.includes("Other") || selectedOpt.value.includes("अन्य");
  const unit = selectedOpt.dataset.unit || "Units";
  const cleanUnit = unit.includes("—") ? unit.split("—")[0].trim() : unit;

  if (unitBadge) {
    unitBadge.innerText = isOther ? "Units" : cleanUnit;
  }

  if (customBox) {
    if (isOther) {
      customBox.classList.remove("hidden");
      if (customNameInput) {
        customNameInput.focus();
      }
    } else {
      customBox.classList.add("hidden");
    }
  }
}

/**
 * STEP 3: PROCEED BUTTON CLICKED
 * CRITICAL RULE: Clicking Proceed DOES NOT create a request!
 * It only matches available sellers in the region.
 */
async function handleProceedSearch(e) {
  e.preventDefault();

  const state = document.getElementById("directState") ? document.getElementById("directState").value.trim() : "";
  const city = document.getElementById("directCity") ? document.getElementById("directCity").value.trim() : "";
  const pincode = document.getElementById("directPincode") ? document.getElementById("directPincode").value.trim() : "";
  const address = document.getElementById("directAddress") ? document.getElementById("directAddress").value.trim() : "";
  const contactPerson = document.getElementById("directContactPerson") ? document.getElementById("directContactPerson").value.trim() : "";
  const contactPhone = document.getElementById("directContactPhone") ? document.getElementById("directContactPhone").value.trim() : "";

  const matSelect = document.getElementById("directMaterialSelect");
  const materialName = matSelect ? matSelect.value.trim() : "";
  const quantityInput = document.getElementById("directQuantity");
  const quantityVal = quantityInput ? quantityInput.value.trim() : "";
  const quantity = parseFloat(quantityVal);

  const customName = document.getElementById("directCustomName") ? document.getElementById("directCustomName").value.trim() : "";
  const customUnit = document.getElementById("directCustomUnit") ? document.getElementById("directCustomUnit").value.trim() : "";
  const isOther = materialName.toLowerCase().includes("other") || materialName.includes("अन्य") || (matSelect && matSelect.options[matSelect.selectedIndex]?.dataset.isOther === "true");

  if (!state || !city || !pincode || !address) {
    showToast("Please fill all delivery location fields — कृपया पूरा डिलीवरी पता भरें", "warning");
    return;
  }

  if (pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
    showToast("Please enter a valid 6-digit PIN code — मान्य 6-अंकों का पिन कोड दर्ज करें", "warning");
    return;
  }

  if (!materialName) {
    showToast("Please select a material — कृपया सामग्री चुनें", "warning");
    return;
  }

  if (isOther && !customName) {
    showToast("Please enter the material name — कृपया सामग्री का नाम दर्ज करें", "warning");
    if (document.getElementById("directCustomName")) {
      document.getElementById("directCustomName").focus();
    }
    return;
  }

  if (!quantityVal || isNaN(quantity) || quantity <= 0) {
    showToast("Please enter a valid quantity (> 0) — मान्य मात्रा दर्ज करें", "warning");
    if (quantityInput) quantityInput.focus();
    return;
  }

  currentSearchPayload = {
    materialName: isOther ? customName : materialName,
    customMaterialName: customName,
    isOther: isOther,
    quantity: quantity,
    state: state,
    city: city,
    pincode: pincode,
    address: address,
    contactPerson: contactPerson,
    contactPhone: contactPhone,
    unit: isOther ? (customUnit || "Units") : (matSelect.options[matSelect.selectedIndex]?.dataset.unit || "Units")
  };

  const proceedBtn = document.getElementById("proceedSearchBtn");
  const origBtnText = proceedBtn ? proceedBtn.innerHTML : "";
  if (proceedBtn) {
    proceedBtn.disabled = true;
    proceedBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i><span>Matching Sellers... / विक्रेता खोजे जा रहे हैं...</span>';
  }

  try {
    const token = getCleanToken();
    const headers = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = "Bearer " + token;
    }

    const res = await fetch(API_BASE_URL + "/api/direct-buy/matching-sellers", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(currentSearchPayload)
    });

    const data = await res.json();

    if (res.ok) {
      renderMatchingSellers(data.sellers || []);
    } else {
      showToast(data.error || "Could not match sellers for this location", "error");
    }
  } catch (err) {
    console.error("Seller matching error:", err);
    showToast("Network error searching sellers. Please try again.", "error");
  } finally {
    if (proceedBtn) {
      proceedBtn.disabled = false;
      proceedBtn.innerHTML = origBtnText;
    }
  }
}

/**
 * Render seller cards
 * CRITICAL RULE: Card contains ONLY the requested material information!
 */
function renderMatchingSellers(sellers) {
  const section = document.getElementById("matchingSellersSection");
  const container = document.getElementById("sellersContainer");
  const countBadge = document.getElementById("matchingCountBadge");
  const summaryText = document.getElementById("matchSummaryText");

  if (!section || !container) return;

  section.classList.remove("hidden");
  container.innerHTML = "";

  if (countBadge) {
    countBadge.innerText = `${sellers.length} ${sellers.length === 1 ? 'Seller' : 'Sellers'}`;
  }

  if (summaryText && currentSearchPayload) {
    summaryText.innerText = `Sellers with stock for ${currentSearchPayload.materialName} (${currentSearchPayload.quantity} ${currentSearchPayload.unit}) near ${currentSearchPayload.city}, ${currentSearchPayload.pincode}`;
  }

  if (sellers.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-3">
        <div class="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto text-xl">
          <i class="fa-solid fa-box-open"></i>
        </div>
        <h4 class="font-bold text-slate-800 text-sm">No sellers found for this material in your selected location.</h4>
        <p class="text-xs text-slate-500 max-w-md mx-auto">
          इस सामग्री के लिए आपकी चुनी गई लोकेशन में कोई विक्रेता नहीं मिला।
        </p>
        <p class="text-[11px] text-slate-400">
          Tip: You can reduce the requested quantity or post a material requirement to request custom supply.
        </p>
      </div>
    `;
    // Scroll to results
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  sellers.forEach(s => {
    const card = document.createElement("div");
    card.className = "seller-match-card space-y-3.5";

    const cleanUnit = (s.unit || "Unit").split("—")[0].trim();
    const priceFormatted = "₹" + Number(s.unitPrice).toLocaleString("en-IN") + " / " + cleanUnit;
    const stockFormatted = Number(s.availableStock).toLocaleString("en-IN") + " " + cleanUnit;

    let transportBadge = "";
    if (s.transportationCost === 0) {
      if (s.transportationChargeBasis === "Free Delivery") {
        transportBadge = `<span class="inline-flex items-center text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-bold"><i class="fa-solid fa-truck-fast mr-1"></i>Free Delivery</span>`;
      } else {
        transportBadge = `<span class="inline-flex items-center text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold"><i class="fa-solid fa-truck mr-1"></i>Fair charge on dispatch</span>`;
      }
    } else {
      transportBadge = `<span class="inline-flex items-center text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] font-bold"><i class="fa-solid fa-truck mr-1"></i>₹${Number(s.transportationCost).toLocaleString("en-IN")}</span>`;
    }

    const distText = s.distanceKm ? `• ~${s.distanceKm} KM away` : "";

    card.innerHTML = `
      <!-- Seller Info -->
      <div class="flex items-start justify-between pb-3 border-b border-slate-100">
        <div>
          <div class="flex items-center space-x-1.5">
            <span class="text-base font-bold text-slate-900">${escapeHtml(s.sellerName)}</span>
            <i class="fa-solid fa-circle-check text-blue-500 text-xs" title="Verified Seller"></i>
          </div>
          <p class="text-[11px] text-slate-500 mt-0.5 flex items-center">
            <i class="fa-solid fa-location-dot text-rose-500 mr-1 text-[10px]"></i>
            <span>${escapeHtml(s.sellerCity || '')}, ${escapeHtml(s.sellerState || '')} (PIN: ${escapeHtml(s.sellerPincode || '')}) ${distText}</span>
          </p>
        </div>
      </div>

      <!-- Selected Material Only -->
      <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
        <div class="flex items-center justify-between">
          <span class="text-slate-500">Material — सामग्री:</span>
          <span class="font-bold text-slate-900">${escapeHtml(s.materialName)}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-slate-500">Seller Price — दर:</span>
          <span class="font-extrabold text-blue-700">${escapeHtml(priceFormatted)}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-slate-500">Available Stock — स्टॉक:</span>
          <span class="font-bold text-emerald-700">${escapeHtml(stockFormatted)}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-slate-500">Transportation — परिवहन:</span>
          <div>${transportBadge}</div>
        </div>
      </div>

      <!-- Action Button -->
      <button type="button" onclick="selectSeller(${s.sellerId})" class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer">
        <i class="fa-solid fa-check"></i>
        <span>Select Seller — सेलर चुनें</span>
      </button>
    `;

    // Cache seller data on card
    card.dataset.sellerId = s.sellerId;
    container.appendChild(card);
  });

  // Store sellers in window cache
  window.cachedMatchingSellers = sellers;

  // Scroll smoothly to results
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * STEP 4: SELECT SELLER
 * Opens Review & Confirmation screen without creating an order
 */
function selectSeller(sellerId) {
  const sellers = window.cachedMatchingSellers || [];
  const s = sellers.find(x => String(x.sellerId) === String(sellerId));
  if (!s) return;

  selectedSellerData = s;
  const user = getCurrentUser() || {};
  const roleRaw = (user.role || (user.roles && user.roles[0]) || "CUSTOMER").toString().replace("ROLE_", "").toUpperCase();

  const buyerNameEl = document.getElementById("revBuyerName");
  const buyerRoleEl = document.getElementById("revBuyerRole");
  const sellerNameEl = document.getElementById("revSellerName");
  const sellerLocEl = document.getElementById("revSellerLoc");
  const matNameEl = document.getElementById("revMaterialName");
  const qtyEl = document.getElementById("revQuantity");
  const unitPriceEl = document.getElementById("revUnitPrice");
  const matAmtEl = document.getElementById("revMaterialAmount");
  const transCostEl = document.getElementById("revTransportCost");
  const transNoticeEl = document.getElementById("revTransportNotice");
  const totalEl = document.getElementById("revEstimatedTotal");
  const addrEl = document.getElementById("revDeliveryAddress");

  const cleanUnit = (s.unit || "Unit").split("—")[0].trim();

  if (buyerNameEl) buyerNameEl.innerText = user.name || user.fullName || "Buyer";
  if (buyerRoleEl) buyerRoleEl.innerText = roleRaw;
  if (sellerNameEl) sellerNameEl.innerText = s.sellerName;
  if (sellerLocEl) sellerLocEl.innerText = `${s.sellerCity}, ${s.sellerState} (${s.sellerPincode})`;

  if (matNameEl) matNameEl.innerText = s.materialName;
  if (qtyEl) qtyEl.innerText = `${s.requestedQuantity} ${cleanUnit}`;
  if (unitPriceEl) unitPriceEl.innerText = `₹${Number(s.unitPrice).toLocaleString('en-IN')} / ${cleanUnit}`;

  if (matAmtEl) matAmtEl.innerText = "₹" + Number(s.materialAmount).toLocaleString("en-IN");
  if (transCostEl) transCostEl.innerText = "₹" + Number(s.transportationCost).toLocaleString("en-IN");
  if (transNoticeEl) {
    if (s.beyondRadius) {
      transNoticeEl.innerText = "Location beyond standard radius — Fair charge will be applied";
    } else {
      transNoticeEl.innerText = s.transportationChargeBasis ? `Basis: ${s.transportationChargeBasis}` : "";
    }
  }

  if (totalEl) totalEl.innerText = "₹" + Number(s.estimatedTotal).toLocaleString("en-IN");

  if (addrEl && currentSearchPayload) {
    addrEl.innerText = `${currentSearchPayload.address}, ${currentSearchPayload.city}, ${currentSearchPayload.state} - ${currentSearchPayload.pincode} (Contact: ${currentSearchPayload.contactPerson}, ${currentSearchPayload.contactPhone})`;
  }

  const modal = document.getElementById("reviewModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

function closeReviewModal() {
  const modal = document.getElementById("reviewModal");
  if (modal) {
    modal.classList.remove("flex");
    modal.classList.add("hidden");
  }
}

/**
 * STEP 5: FINAL CONFIRMATION & REQUEST SUBMISSION
 * ONLY this action creates the request in the database.
 */
async function submitDirectBuyRequest() {
  const token = getCleanToken();
  if (!token) {
    showToast("Please login first to submit a request — कृपया पहले लॉगिन करें", "error");
    setTimeout(() => window.location.href = "index.html", 1500);
    return;
  }

  if (!selectedSellerData || !currentSearchPayload) {
    showToast("Please select a seller first — कृपया पहले विक्रेता चुनें", "warning");
    return;
  }

  const submitBtn = document.getElementById("confirmSendRequestBtn");
  const origBtnText = submitBtn ? submitBtn.innerHTML : "";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i><span>Sending Direct Request... / अनुरोध भेजा जा रहा है...</span>';
  }

  const payload = {
    sellerId: selectedSellerData.sellerId,
    materialId: selectedSellerData.materialId,
    quantity: currentSearchPayload.quantity,
    state: currentSearchPayload.state,
    city: currentSearchPayload.city,
    pincode: currentSearchPayload.pincode,
    deliveryAddress: currentSearchPayload.address,
    contactPerson: currentSearchPayload.contactPerson,
    contactPhone: currentSearchPayload.contactPhone,
    customMaterialName: currentSearchPayload.customMaterialName,
    unit: currentSearchPayload.unit
  };

  try {
    const res = await fetch(API_BASE_URL + "/api/direct-buy/create-request", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.ok && data.success) {
      closeReviewModal();
      showSuccessModal(data);
    } else {
      const msg = data.error || data.message || "Failed to create Direct Buy request.";
      showToast(msg, "error");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origBtnText;
      }
    }
  } catch (err) {
    console.error("Direct Buy request error:", err);
    showToast("Network error submitting request. Please try again.", "error");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origBtnText;
    }
  }
}

function showSuccessModal(data) {
  const modal = document.getElementById("successModal");
  if (!modal) return;

  const reqIdEl = document.getElementById("successReqId");
  const codeEl = document.getElementById("successVerCode");
  const sellerEl = document.getElementById("successSeller");
  const totalEl = document.getElementById("successTotal");

  if (reqIdEl) reqIdEl.innerText = data.requestId || "DMR-1001";
  if (codeEl) codeEl.innerText = data.verificationCode || "BB-DM-482913";
  if (sellerEl) sellerEl.innerText = data.sellerName || "-";
  if (totalEl) totalEl.innerText = "₹" + Number(data.estimatedTotal).toLocaleString("en-IN");

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

function showToast(message, type = "info") {
  const toast = document.getElementById("directToast");
  const msgEl = document.getElementById("directToastMsg");
  const iconEl = document.getElementById("directToastIcon");
  if (!toast || !msgEl) return;

  msgEl.innerText = message;
  if (type === "error") {
    iconEl.className = "fa-solid fa-circle-exclamation text-rose-400";
  } else if (type === "warning") {
    iconEl.className = "fa-solid fa-triangle-exclamation text-amber-400";
  } else {
    iconEl.className = "fa-solid fa-circle-info text-blue-400";
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
