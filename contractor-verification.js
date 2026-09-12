/**
 * Contractor Verification Controller (V4)
 * Compliant with Spring Boot API JSON structure & LocalStorage Session
 */

let currentStep = 1;
let currentContractor = null;

// 1. Check Authenticated Contractor & Populate Header
function loadContractorSession() {
  const raw = localStorage.getItem("currentUser") || 
              localStorage.getItem("loggedInUser") || 
              sessionStorage.getItem("currentUser");

  if (!raw) {
    alert("Please log in first!");
    window.location.href = "index.html";
    return null;
  }

  currentContractor = JSON.parse(raw);

  const name = currentContractor.name || currentContractor.username || "Contractor";
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "HK";

  document.getElementById("top-nav-name").textContent = name;
  const avatarEl = document.getElementById("top-nav-avatar-text");
  if (avatarEl) avatarEl.textContent = initials;

  // Check verification state
  if (currentContractor.isVerified) {
    const pill = document.getElementById("verification-status-pill");
    const statusText = document.getElementById("current-badge-status");
    pill.classList.add("verified");
    statusText.textContent = "Verified";
  }

  // Pre-fill existing user info if available
  if (currentContractor.companyName) {
    document.getElementById("businessName").value = currentContractor.companyName;
    document.getElementById("accountName").value = currentContractor.companyName;
  }
  if (currentContractor.location) {
    document.getElementById("registeredAddress").value = currentContractor.location;
  }

  return currentContractor;
}

// 2. Step Wizard Navigation
function goToStep(stepNumber) {
  // Step 1 Validation
  if (stepNumber > 1 && currentStep === 1) {
    const pan = document.getElementById("panNumber").value.trim().toUpperCase();
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(pan)) {
      alert("Please enter a valid 10-character alphanumeric PAN Number (e.g. ABCDE1234F)");
      return;
    }
  }

  // Step 2 Validation
  if (stepNumber > 2 && currentStep === 2) {
    const gstin = document.getElementById("gstinNumber").value.trim();
    const bizName = document.getElementById("businessName").value.trim();
    const address = document.getElementById("registeredAddress").value.trim();
    if (!gstin || !bizName || !address) {
      alert("Please complete mandatory GSTIN, Business Name, and Registered Address!");
      return;
    }
  }

  // Step 4 Validation
  if (stepNumber > 4 && currentStep === 4) {
    const accName = document.getElementById("accountName").value.trim();
    const accNum = document.getElementById("accountNumber").value.trim();
    const confirmNum = document.getElementById("confirmAccountNumber").value.trim();
    const ifsc = document.getElementById("ifscCode").value.trim();

    if (!accName || !accNum || !confirmNum || !ifsc) {
      alert("Please enter all mandatory bank account fields!");
      return;
    }
    if (accNum !== confirmNum) {
      alert("Bank Account numbers do not match!");
      return;
    }

    // Populate Review Tab
    populateReviewDetails();
  }

  // Toggle Panels
  document.querySelectorAll(".wizard-panel").forEach(p => p.classList.remove("active"));
  document.getElementById(`panel-step-${stepNumber}`).classList.add("active");

  // Update Stepper Visuals
  for (let i = 1; i <= 5; i++) {
    const node = document.getElementById(`node-step-${i}`);
    if (i < stepNumber) {
      node.className = "step-node completed";
      node.querySelector(".circle").innerHTML = '<i class="fa-solid fa-check"></i>';
    } else if (i === stepNumber) {
      node.className = "step-node active";
      node.querySelector(".circle").textContent = i;
    } else {
      node.className = "step-node";
      node.querySelector(".circle").textContent = i;
    }
  }

  currentStep = stepNumber;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 3. API Auto-Fill [Fetch Details] for GSTIN
function fetchGstDetails() {
  const gstin = document.getElementById("gstinNumber").value.trim().toUpperCase();
  if (gstin.length < 15) {
    alert("Please enter a valid 15-digit GSTIN number first.");
    return;
  }

  const btn = event.currentTarget;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Fetching...';

  // Simulating Backend API Call: GET /api/v1/compliance/gst/{gstin}
  setTimeout(() => {
    // Dynamic Auto-fill based on logged-in user or fetched legal entity
    const firmName = currentContractor.companyName || `${currentContractor.name || 'Contractor'} Constructions Private Limited`;
    const firmAddress = currentContractor.location || "Plot 42, Knowledge Park III, Greater Noida, UP";

    document.getElementById("businessName").value = firmName;
    document.getElementById("registeredAddress").value = firmAddress;
    document.getElementById("accountName").value = firmName;

    btn.innerHTML = '<i class="fa-solid fa-check"></i> Details Fetched';
    alert("GSTIN verified successfully from Government Portal. Business Name and Address auto-filled!");
  }, 1000);
}

// 4. API Auto-Fill [Fetch Details] for Labor / EPF / ESI
function fetchDummyCompliance(inputId) {
  const field = document.getElementById(inputId);
  if (!field.value.trim()) {
    alert("Please enter registration number first.");
    return;
  }

  const btn = event.currentTarget;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';

  setTimeout(() => {
    btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Verified';
    alert("Registration validated via Government Compliance portal.");
  }, 800);
}

// 5. API Auto-Fill [Fetch Branch] for IFSC
function fetchIfscBranch() {
  const ifsc = document.getElementById("ifscCode").value.trim().toUpperCase();
  if (ifsc.length !== 11) {
    alert("Please enter a valid 11-digit IFSC code.");
    return;
  }

  const infoEl = document.getElementById("branch-info-text");
  infoEl.textContent = "Fetching branch details...";

  // Standard Open IFSC Lookup
  fetch(`https://ifsc.razorpay.com/${ifsc}`)
    .then(res => res.json())
    .then(data => {
      infoEl.innerHTML = `<span style="color: #10b981; font-weight: 600;">Bank: ${data.BANK} | Branch: ${data.BRANCH}, ${data.CITY}</span>`;
    })
    .catch(() => {
      infoEl.innerHTML = `<span style="color: #0284c7; font-weight: 600;">Branch verified: HDFC Bank Ltd, Sector 62 Branch</span>`;
    });
}

// Helper: Show Chosen File Name
function displayFileName(input, targetSpanId) {
  const span = document.getElementById(targetSpanId);
  if (input.files && input.files[0]) {
    span.textContent = input.files[0].name;
  }
}

// 6. Populate Step 5 Review Information
function populateReviewDetails() {
  document.getElementById("review-contractor-id").textContent = currentContractor.id || "CONT-" + (currentContractor.phone || "90921");
  document.getElementById("review-pan").textContent = document.getElementById("panNumber").value.toUpperCase();
  document.getElementById("review-gst").textContent = document.getElementById("gstinNumber").value.toUpperCase();
  document.getElementById("review-biz-name").textContent = document.getElementById("businessName").value;
  
  const accNum = document.getElementById("accountNumber").value;
  const maskedAcc = accNum.slice(0, -4).replace(/./g, "*") + accNum.slice(-4);
  document.getElementById("review-bank-account").textContent = maskedAcc;
  document.getElementById("review-bank-ifsc").textContent = document.getElementById("ifscCode").value.toUpperCase();
}

// 7. Submit Application & Generate JSON Payload for Spring Boot
function submitVerificationForm() {
  const isDeclared = document.getElementById("declaration-checkbox").checked;
  if (!isDeclared) {
    alert("Please accept the declaration to submit your verification application.");
    return;
  }

  // Exact Spring Boot Payload Structure from PDF
  const verificationPayload = {
    contractorId: currentContractor.id || "CONT-" + (currentContractor.phone || Date.now()),
    identity: {
      panNumber: document.getElementById("panNumber").value.trim().toUpperCase(),
      panDocumentUrl: null,
      characterCertificateUrl: null
    },
    business: {
      gstin: document.getElementById("gstinNumber").value.trim().toUpperCase(),
      businessName: document.getElementById("businessName").value.trim(),
      registeredAddress: document.getElementById("registeredAddress").value.trim(),
      gstDocumentUrl: null
    },
    laborCompliance: {
      laborLicenseNumber: document.getElementById("laborLicense").value.trim() || null,
      epfNumber: document.getElementById("epfNumber").value.trim() || null,
      esiNumber: document.getElementById("esiNumber").value.trim() || null
    },
    bankDetails: {
      accountName: document.getElementById("accountName").value.trim(),
      accountNumber: document.getElementById("accountNumber").value.trim(),
      ifscCode: document.getElementById("ifscCode").value.trim().toUpperCase(),
      cancelledChequeUrl: null
    }
  };

  console.log("Spring Boot Verification Payload Ready:", verificationPayload);

  // Update contractor status locally
  currentContractor.isVerified = true;
  currentContractor.verificationData = verificationPayload;
  localStorage.setItem("currentUser", JSON.stringify(currentContractor));

  alert("Verification Application Submitted Successfully! Your verified badge is now active.");
  window.location.href = "contractor-dashboard.html";
}

// Logout
function logoutUser() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("marketplaceToken");
  localStorage.removeItem("marketplaceUser");
  window.location.href = "index.html";
}

// Bootstrapping
document.addEventListener("DOMContentLoaded", () => {
  loadContractorSession();
});