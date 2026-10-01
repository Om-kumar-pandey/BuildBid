/* ==========================================================================
   BuildBid Pro — Add New Service Script (add-new-service.js)
   Bilingual (English + Hindi) Standalone Service Creation Workflow
   ========================================================================== */

// ========================================================
// 1. CORE UTILITIES & AUTHENTICATION
// ========================================================

function getApiBaseUrl() {
  if (typeof window !== "undefined" && window.location) {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://localhost:8080";
    }
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

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast-item px-4 py-3 rounded-xl shadow-float text-xs font-semibold flex items-center space-x-2.5 max-w-md transition-all";

  if (type === "success") {
    toast.classList.add("bg-emerald-600", "text-white");
    toast.innerHTML = `<i class="fa-solid fa-circle-check text-sm"></i><span>${message}</span>`;
  } else if (type === "error") {
    toast.classList.add("bg-rose-600", "text-white");
    toast.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-sm"></i><span>${message}</span>`;
  } else {
    toast.classList.add("bg-slate-900", "text-white");
    toast.innerHTML = `<i class="fa-solid fa-circle-info text-sm text-orange-400"></i><span>${message}</span>`;
  }

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ========================================================
// 2. STATE VARIABLES
// ========================================================

let masterCatalog = [];
let selectedCategory = null;
let selectedService = null;
let uploadedDocument = { name: null, type: null, data: null };
let myExistingServices = [];

// ========================================================
// 3. INITIALIZATION & AUTH GUARD
// ========================================================

window.addEventListener("DOMContentLoaded", async () => {
  const token = getCleanToken();
  const cachedRaw = localStorage.getItem("currentUser") || localStorage.getItem("marketplaceUser");

  if (!token && !cachedRaw) {
    window.location.href = "index.html";
    return;
  }

  // Validate session with backend /api/me
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/me`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json"
      }
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        showToast("Session expired. Please log in again — सत्र समाप्त हो गया है।", "error");
        setTimeout(() => window.location.href = "index.html", 1500);
        return;
      }
    } else {
      const profile = await res.json();
      const roles = profile.roles || [];
      const hasProRole = roles.some(r => {
        const str = String(r).toUpperCase();
        return str.includes("PROFESSIONAL") || str.includes("SERVICE_PROVIDER");
      });

      // Role guard: Only professionals may publish services
      if (roles.length > 0 && !hasProRole) {
        showToast("Access restricted: Only professional providers can add services — केवल पेशेवर ही सेवाएँ जोड़ सकते हैं", "error");
        setTimeout(() => window.location.href = "index.html", 2000);
        return;
      }
    }
  } catch (err) {
    console.warn("Could not verify /api/me (working with cached session):", err);
  }

  // Bind file drag & drop listeners
  setupFileUploadListeners();

  // Bind live preview updater listeners
  setupLivePreviewListeners();

  // Load Master Catalog and current professional services
  await Promise.all([
    loadMasterCatalog(),
    loadExistingServices()
  ]);
});

// ========================================================
// 4. LOAD MASTER SERVICE CATALOG FROM BACKEND
// ========================================================

async function loadMasterCatalog() {
  const container = document.getElementById("categories-container");
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/public/master-catalog`);
    if (!res.ok) throw new Error("Catalog fetch failed with status: " + res.status);

    masterCatalog = await res.json();
    renderCategories();
  } catch (err) {
    console.error("Failed to load master catalog:", err);
    if (container) {
      container.innerHTML = `
        <div class="col-span-full py-6 text-center text-xs text-rose-600 bg-rose-50 rounded-xl border border-rose-200 p-4">
          <i class="fa-solid fa-circle-exclamation text-base mb-1 block"></i>
          <span>Unable to connect to Master Service Catalog — मास्टर सेवा कैटलॉग से जुड़ने में असमर्थ।</span>
          <button type="button" onclick="loadMasterCatalog()" class="mt-2 block mx-auto px-3 py-1 bg-white border border-rose-300 rounded-lg text-rose-700 font-semibold hover:bg-rose-100 transition">Retry / पुनः प्रयास करें</button>
        </div>
      `;
    }
  }
}

async function loadExistingServices() {
  const token = getCleanToken();
  if (!token) return;

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/professional/services`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json"
      }
    });
    if (res.ok) {
      myExistingServices = await res.json();
    }
  } catch (err) {
    console.warn("Could not load existing services for duplicate check:", err);
  }
}

// ========================================================
// 5. RENDER CATEGORIES (STEP 1)
// ========================================================

function renderCategories() {
  const container = document.getElementById("categories-container");
  if (!container) return;

  if (!masterCatalog || masterCatalog.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-4 text-center text-xs text-slate-500">
        No active service categories available — कोई सक्रिय श्रेणी उपलब्ध नहीं है।
      </div>
    `;
    return;
  }

  container.innerHTML = masterCatalog.map(cat => `
    <div onclick="selectCategory(${cat.id})" id="cat-card-${cat.id}" class="category-card p-3.5 bg-slate-50 hover:bg-orange-50/40 rounded-xl border border-slate-200 flex items-center space-x-3 transition">
      <div class="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-base flex-shrink-0">
        <i class="fa-solid ${cat.icon || 'fa-briefcase'}"></i>
      </div>
      <div class="overflow-hidden">
        <h3 class="text-xs font-bold text-slate-900 truncate">${cat.nameEn}</h3>
        <p class="text-[11px] text-slate-500 truncate">${cat.nameHi}</p>
        <span class="text-[10px] text-orange-600 font-semibold mt-0.5 block">${(cat.services || []).length} Services Available</span>
      </div>
    </div>
  `).join("");
}

function selectCategory(categoryId) {
  selectedCategory = masterCatalog.find(c => c.id === categoryId);
  if (!selectedCategory) return;

  document.getElementById("selected-category-id").value = categoryId;

  // Update visual selection state
  document.querySelectorAll(".category-card").forEach(el => el.classList.remove("selected"));
  const activeCard = document.getElementById(`cat-card-${categoryId}`);
  if (activeCard) activeCard.classList.add("selected");

  // Unlock and populate Step 2
  const servicesSection = document.getElementById("section-services");
  if (servicesSection) {
    servicesSection.classList.remove("opacity-60", "pointer-events-none");
  }

  renderServicesForCategory();

  // Reset service selection if category changed
  selectedService = null;
  document.getElementById("selected-master-service-id").value = "";
  hideVerificationNotice();
  hideCredentialSection();
  updateLivePreview();
}

// ========================================================
// 6. RENDER MASTER SERVICES (STEP 2)
// ========================================================

function renderServicesForCategory() {
  const container = document.getElementById("services-container");
  if (!container || !selectedCategory) return;

  const services = selectedCategory.services || [];
  if (services.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-4 text-center text-xs text-slate-500">
        No master services available in this category — इस श्रेणी में कोई सेवा उपलब्ध नहीं है।
      </div>
    `;
    return;
  }

  container.innerHTML = services.map(srv => {
    const isBasic = !srv.verificationRequired;
    const badgeText = isBasic ? "Verification Not Required — सामान्य" : "Verification Required — सत्यापन आवश्यक";
    const badgeClass = isBasic ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200";

    return `
      <div onclick="selectMasterService(${srv.id})" id="srv-card-${srv.id}" class="service-card p-4 bg-white rounded-xl border border-slate-200 shadow-subtle flex flex-col justify-between space-y-2 transition">
        <div>
          <div class="flex items-start justify-between">
            <h4 class="text-xs font-bold text-slate-900">${srv.titleEn}</h4>
            <span class="px-2 py-0.5 rounded-full text-[9px] font-bold border ${badgeClass}">
              ${isBasic ? '<i class="fa-solid fa-circle-check mr-1"></i>Basic' : '<i class="fa-solid fa-shield-halved mr-1"></i>Credential'}
            </span>
          </div>
          <p class="text-[11px] text-slate-500">${srv.titleHi}</p>
        </div>

        <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
          <span>Default: <strong>${srv.defaultPricingUnit || 'Per Visit'}</strong></span>
          <span class="text-orange-600 font-semibold flex items-center">
            <span>Select</span> <i class="fa-solid fa-chevron-right ml-1 text-[8px]"></i>
          </span>
        </div>
      </div>
    `;
  }).join("");
}

function selectMasterService(serviceId) {
  if (!selectedCategory) return;
  const services = selectedCategory.services || [];
  selectedService = services.find(s => s.id === serviceId);
  if (!selectedService) return;

  document.getElementById("selected-master-service-id").value = serviceId;

  // Highlight service card
  document.querySelectorAll(".service-card").forEach(el => el.classList.remove("selected"));
  const activeCard = document.getElementById(`srv-card-${serviceId}`);
  if (activeCard) activeCard.classList.add("selected");

  // Pre-fill form fields
  document.getElementById("service-title-en").value = selectedService.titleEn;
  document.getElementById("service-title-hi").value = selectedService.titleHi;

  const unitSelect = document.getElementById("service-pricing-unit");
  if (unitSelect && selectedService.defaultPricingUnit) {
    for (let i = 0; i < unitSelect.options.length; i++) {
      if (unitSelect.options[i].value.toLowerCase().includes(selectedService.defaultPricingUnit.toLowerCase())) {
        unitSelect.selectedIndex = i;
        break;
      }
    }
  }

  // Handle verification requirement
  if (!selectedService.verificationRequired) {
    // Basic service flow
    showBasicVerificationNotice();
    hideCredentialSection();
    document.getElementById("step-number-pricing").innerText = "3";
  } else {
    // Credential service flow
    showCredentialVerificationNotice();
    showCredentialSection();
    document.getElementById("step-number-pricing").innerText = "4";
  }

  updateLivePreview();
}

// ========================================================
// 7. VERIFICATION FLOW & SECTION TOGGLING
// ========================================================

function showBasicVerificationNotice() {
  const banner = document.getElementById("verification-banner");
  if (!banner) return;

  banner.className = "rounded-2xl p-4 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 transition-all flex items-start space-x-3";
  banner.innerHTML = `
    <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 text-sm mt-0.5">
      <i class="fa-solid fa-circle-check"></i>
    </div>
    <div>
      <h3 class="font-bold text-emerald-900">Verification Not Required — सत्यापन आवश्यक नहीं</h3>
      <p class="text-[11px] text-emerald-700 mt-0.5">
        This is a standard trade or craft service. No degree or license certificate is required. Your service will become <strong class="text-emerald-900">Active Immediately</strong> upon submission.
      </p>
      <p class="text-[10px] text-emerald-600 mt-0.5 font-medium">
        यह एक बुनियादी निर्माण सेवा है। इसके लिए किसी लाइसेंस या डिग्री दस्तावेज़ की आवश्यकता नहीं है।
      </p>
    </div>
  `;
  banner.classList.remove("hidden");
}

function showCredentialVerificationNotice() {
  const banner = document.getElementById("verification-banner");
  if (!banner) return;

  banner.className = "rounded-2xl p-4 bg-amber-50 border border-amber-200 text-xs text-amber-800 transition-all flex items-start space-x-3";
  banner.innerHTML = `
    <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 text-sm mt-0.5">
      <i class="fa-solid fa-shield-halved"></i>
    </div>
    <div>
      <h3 class="font-bold text-amber-900">Verification Required — सत्यापन आवश्यक</h3>
      <p class="text-[11px] text-amber-700 mt-0.5">
        This high-level professional service requires verified credentials. After submission, it will be marked as <strong class="text-amber-900">"Verification Pending"</strong> until reviewed by BuildBid administrators.
      </p>
      <p class="text-[10px] text-amber-600 mt-0.5 font-medium">
        यह सेवा आपके प्रमाण-पत्रों के BuildBid एडमिन द्वारा सत्यापन के बाद ही सार्वजनिक रूप से दिखाई देगी।
      </p>
    </div>
  `;
  banner.classList.remove("hidden");
}

function hideVerificationNotice() {
  const banner = document.getElementById("verification-banner");
  if (banner) banner.classList.add("hidden");
}

function showCredentialSection() {
  const section = document.getElementById("section-credentials");
  if (!section) return;

  section.classList.remove("hidden");
  document.getElementById("credential-qualification").required = true;
  document.getElementById("credential-license").required = true;
  document.getElementById("credential-authority").required = true;
}

function hideCredentialSection() {
  const section = document.getElementById("section-credentials");
  if (!section) return;

  section.classList.add("hidden");
  document.getElementById("credential-qualification").required = false;
  document.getElementById("credential-license").required = false;
  document.getElementById("credential-authority").required = false;
}

// ========================================================
// 8. DOCUMENT UPLOAD & VALIDATION (<= 5MB, PDF/JPG/PNG)
// ========================================================

function setupFileUploadListeners() {
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("credential-file");

  if (!dropZone || !fileInput) return;

  dropZone.addEventListener("click", () => fileInput.click());

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  });
}

function processSelectedFile(file) {
  if (!file) return;

  // Max 5 MB validation (5 * 1024 * 1024 bytes)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    showToast("File exceeds 5 MB limit. Please upload a smaller file — फ़ाइल 5 MB से अधिक है।", "error");
    return;
  }

  // Type validation: PDF, JPG, JPEG, PNG
  const validTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
  const extension = file.name.split(".").pop().toLowerCase();
  const validExtensions = ["pdf", "jpg", "jpeg", "png"];

  if (!validTypes.includes(file.type) && !validExtensions.includes(extension)) {
    showToast("File must be PDF, JPG, JPEG, or PNG — फ़ाइल PDF, JPG, JPEG या PNG होनी चाहिए।", "error");
    return;
  }

  // Convert to Base64 via FileReader
  const reader = new FileReader();
  reader.onload = function(e) {
    uploadedDocument = {
      name: file.name,
      type: file.type || "application/pdf",
      data: e.target.result
    };

    // Update Preview UI
    const placeholder = document.getElementById("upload-placeholder");
    const preview = document.getElementById("upload-preview");
    const filenameEl = document.getElementById("upload-filename");
    const filesizeEl = document.getElementById("upload-filesize");
    const iconEl = document.getElementById("upload-icon");

    if (placeholder) placeholder.classList.add("hidden");
    if (preview) preview.classList.remove("hidden");
    if (filenameEl) filenameEl.innerText = file.name;
    if (filesizeEl) filesizeEl.innerText = (file.size / (1024 * 1024)).toFixed(2) + " MB";

    if (iconEl) {
      iconEl.className = extension === "pdf" ? "fa-solid fa-file-pdf" : "fa-solid fa-file-image";
    }

    showToast(`Document "${file.name}" attached successfully — दस्तावेज़ संलग्न किया गया`, "success");
  };

  reader.onerror = function() {
    showToast("Error reading file. Please try another file — फ़ाइल पढ़ने में त्रुटि।", "error");
  };

  reader.readAsDataURL(file);
}

function removeUploadedFile(e) {
  if (e) e.stopPropagation();

  uploadedDocument = { name: null, type: null, data: null };
  const fileInput = document.getElementById("credential-file");
  if (fileInput) fileInput.value = "";

  const placeholder = document.getElementById("upload-placeholder");
  const preview = document.getElementById("upload-preview");

  if (preview) preview.classList.add("hidden");
  if (placeholder) placeholder.classList.remove("hidden");
}

// ========================================================
// 9. LIVE SERVICE PREVIEW UPDATER
// ========================================================

function setupLivePreviewListeners() {
  const inputs = [
    "service-title-en",
    "service-title-hi",
    "service-price",
    "service-pricing-unit",
    "service-turnaround",
    "service-radius",
    "service-mode",
    "service-short-desc"
  ];

  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", updateLivePreview);
      el.addEventListener("change", updateLivePreview);
    }
  });
}

function updateLivePreview() {
  const titleEn = document.getElementById("service-title-en")?.value.trim() || (selectedService?.titleEn || "Select a service...");
  const titleHi = document.getElementById("service-title-hi")?.value.trim() || (selectedService?.titleHi || "सेवा चुनें...");
  const priceVal = parseFloat(document.getElementById("service-price")?.value) || 0;
  const unit = document.getElementById("service-pricing-unit")?.value || (selectedService?.defaultPricingUnit || "Per Visit");
  const turnaround = document.getElementById("service-turnaround")?.value.trim() || "1-2 Days";
  const radius = document.getElementById("service-radius")?.value || "25";
  const mode = document.getElementById("service-mode")?.value || "ON_SITE";
  const desc = document.getElementById("service-short-desc")?.value.trim() || "Service summary and inspection scope will appear here as you type.";

  // Mode label
  let modeLabel = "On-Site Service";
  if (mode === "REMOTE") modeLabel = "Remote / Online Consultation";
  if (mode === "BOTH") modeLabel = "On-Site & Remote";

  // Elements
  const prevTitleEn = document.getElementById("prev-title-en");
  const prevTitleHi = document.getElementById("prev-title-hi");
  const prevPrice = document.getElementById("prev-price");
  const prevUnit = document.getElementById("prev-unit");
  const prevTurnaround = document.getElementById("prev-turnaround");
  const prevRadius = document.getElementById("prev-radius");
  const prevMode = document.getElementById("prev-mode");
  const prevDesc = document.getElementById("prev-desc");
  const prevBadge = document.getElementById("prev-badge");

  if (prevTitleEn) prevTitleEn.innerText = titleEn;
  if (prevTitleHi) prevTitleHi.innerText = titleHi;
  if (prevPrice) prevPrice.innerText = "₹" + priceVal.toLocaleString("en-IN");
  if (prevUnit) prevUnit.innerText = " / " + unit.split("/")[0].trim();
  if (prevTurnaround) prevTurnaround.innerText = turnaround;
  if (prevRadius) prevRadius.innerText = radius + " km Radius";
  if (prevMode) prevMode.innerText = modeLabel;
  if (prevDesc) prevDesc.innerText = desc;

  // Status badge update
  if (prevBadge) {
    if (!selectedService) {
      prevBadge.className = "px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 flex-shrink-0";
      prevBadge.innerText = "Select Service";
    } else if (!selectedService.verificationRequired) {
      prevBadge.className = "px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0";
      prevBadge.innerHTML = `<i class="fa-solid fa-circle-check mr-1"></i>Active on Profile`;
    } else {
      prevBadge.className = "px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0";
      prevBadge.innerHTML = `<i class="fa-solid fa-hourglass-half mr-1"></i>Verification Pending`;
    }
  }
}

// ========================================================
// 10. FORM SUBMISSION HANDLER
// ========================================================

async function handleFormSubmit(e) {
  e.preventDefault();

  const token = getCleanToken();
  if (!token) {
    showToast("Session expired. Please log in again — कृपया दोबारा लॉगिन करें।", "error");
    setTimeout(() => window.location.href = "index.html", 1500);
    return;
  }

  // 1. Service selection check
  if (!selectedService) {
    showToast("Please select a service from Step 2 — कृपया चरण 2 से एक सेवा चुनें।", "error");
    const srvSec = document.getElementById("section-services");
    if (srvSec) srvSec.scrollIntoView({ behavior: "smooth" });
    return;
  }

  // 2. Duplicate check against existing services
  const isDuplicate = myExistingServices.some(s => {
    return s.masterServiceId === selectedService.id || 
           (s.masterService && s.masterService.id === selectedService.id);
  });
  if (isDuplicate) {
    showToast("You have already added this service to your catalog — आपने यह सेवा पहले ही जोड़ रखी है।", "error");
    return;
  }

  // 3. Price validation
  const priceVal = parseFloat(document.getElementById("service-price").value);
  if (isNaN(priceVal) || priceVal <= 0) {
    showToast("Please enter a valid price greater than 0 — कृपया 0 से अधिक मान्य मूल्य दर्ज करें।", "error");
    document.getElementById("service-price").focus();
    return;
  }

  // 4. Credential validations if required
  let qualTitle = "";
  let licNumber = "";
  let issAuth = "";

  if (selectedService.verificationRequired) {
    qualTitle = document.getElementById("credential-qualification")?.value.trim();
    licNumber = document.getElementById("credential-license")?.value.trim();
    issAuth = document.getElementById("credential-authority")?.value.trim();

    if (!qualTitle) {
      showToast("Please enter your qualification title — कृपया अपनी योग्यता दर्ज करें।", "error");
      document.getElementById("credential-qualification").focus();
      return;
    }
    if (!licNumber) {
      showToast("Please enter your license or registration number — कृपया लाइसेंस नंबर दर्ज करें।", "error");
      document.getElementById("credential-license").focus();
      return;
    }
    if (!issAuth) {
      showToast("Please enter the issuing authority — कृपया जारी करने वाला प्राधिकरण दर्ज करें।", "error");
      document.getElementById("credential-authority").focus();
      return;
    }
    if (!uploadedDocument.data) {
      showToast("Please upload your credential document (PDF/JPG/PNG max 5MB) — कृपया प्रमाण-पत्र अपलोड करें।", "error");
      document.getElementById("drop-zone").scrollIntoView({ behavior: "smooth" });
      return;
    }
  }

  // 5. Build Payload strictly adhering to Phase 1 contract
  const payload = {
    masterServiceId: selectedService.id,
    serviceTitleEn: document.getElementById("service-title-en").value.trim(),
    serviceTitleHi: document.getElementById("service-title-hi").value.trim(),
    shortDescription: document.getElementById("service-short-desc").value.trim(),
    detailedDescription: document.getElementById("service-detailed-desc")?.value.trim() || "",
    whatsIncluded: document.getElementById("service-whats-included")?.value.trim() || "",
    whatsNotIncluded: document.getElementById("service-whats-not-included")?.value.trim() || "",
    price: priceVal,
    pricingUnit: document.getElementById("service-pricing-unit").value.trim(),
    turnaroundTime: document.getElementById("service-turnaround").value.trim(),
    serviceAreaRadiusKm: parseInt(document.getElementById("service-radius").value, 10) || 25,
    serviceMode: document.getElementById("service-mode").value,
    qualificationTitle: selectedService.verificationRequired ? qualTitle : null,
    licenseNumber: selectedService.verificationRequired ? licNumber : null,
    issuingAuthority: selectedService.verificationRequired ? issAuth : null,
    documentName: selectedService.verificationRequired ? uploadedDocument.name : null,
    documentType: selectedService.verificationRequired ? uploadedDocument.type : null,
    documentData: selectedService.verificationRequired ? uploadedDocument.data : null
  };

  // 6. Lock submit button
  const submitBtn = document.getElementById("submit-btn");
  submitBtn.disabled = true;
  const originalBtnContent = submitBtn.innerHTML;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i><span>Publishing Service... / सेवा प्रकाशित हो रही है...</span>`;

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/professional/services`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.ok || res.status === 201) {
      if (data.verificationStatus === "NOT_REQUIRED") {
        showToast("Service added successfully! Active on your profile — सेवा सफलतापूर्वक जोड़ दी गई!", "success");
      } else {
        showToast("Service submitted! Pending admin verification — सेवा जमा हो गई! सत्यापन लंबित है।", "success");
      }

      // Return to Professional Dashboard Services Catalog
      setTimeout(() => {
        window.location.href = "professional dashboard.html#services";
      }, 1200);
    } else {
      const errMsg = data.error || data.message || "Failed to publish service. Please check details.";
      showToast(errMsg, "error");
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnContent;
    }
  } catch (err) {
    console.error("Submission error:", err);
    showToast("Network error connecting to BuildBid server. Please try again — नेटवर्क त्रुटि।", "error");
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnContent;
  }
}
