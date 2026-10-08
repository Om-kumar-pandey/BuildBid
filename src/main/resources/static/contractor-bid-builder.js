/* =========================================================
   BUILDBID CONTRACTOR BID BUILDER - COMPLETELY DYNAMIC ENGINE
   Project-Type-Aware, Zero-Pre-Fill, Bilingual Sequential Flow
   ========================================================= */

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

let currentStep = 1;
const totalSteps = 17;
let activeProject = null;
let projectMode = "NEW_CONSTRUCTION"; // NEW_CONSTRUCTION | RENOVATION | EXTENSION | INTERIOR | COMMERCIAL | INDUSTRIAL | OTHER

// 1. DYNAMIC INITIALIZATION & DATA POPULATION
document.addEventListener("DOMContentLoaded", async function() {
    initDynamicContractor();
    await initDynamicProjectData();

    const today = new Date();
    const startDateInp = document.getElementById("startDate");
    if (startDateInp && !startDateInp.value) {
        startDateInp.value = today.toISOString().split("T")[0];
    }

    populateDefaultDynamicTables();

    // Check if there is an existing draft saved by the contractor
    loadDraftIfAvailable();

    calculateTotals();
    calculateMaterialTotal();
    calculateLabourTotal();
    calculateFinalBid();
    calculatePayments();
    updateProgress();
    updateStepperUI();
    updateNavigation();
});

function initDynamicContractor() {
    const rawUser = localStorage.getItem("currentUser") || localStorage.getItem("loggedInUser");
    let name = "Verified Contractor";
    let initials = "BC";

    if (rawUser) {
        try {
            const user = JSON.parse(rawUser);
            name = user.name || user.username || user.companyName || name;
            initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
        } catch (e) {
            console.warn("User parse error:", e);
        }
    }

    const nameElem = document.getElementById("top-nav-name") || document.getElementById("contractorNameDisplay");
    if (nameElem) nameElem.textContent = name;
    const avatarText = document.getElementById("top-nav-avatar-text");
    if (avatarText) {
        avatarText.textContent = initials;
    } else {
        const avatarElem = document.getElementById("top-nav-avatar") || document.getElementById("contractorAvatar");
        if (avatarElem) avatarElem.textContent = initials;
    }
}

async function initDynamicProjectData() {
    const urlParams = new URLSearchParams(window.location.search);
    const projectIdFromUrl = urlParams.get("projectId");

    if (!projectIdFromUrl) {
        alert("No Project ID provided. Please select a project from Contractor Projects or Dashboard.\nकोई परियोजना आईडी नहीं दी गई। कृपया डैशबोर्ड से एक परियोजना चुनें।");
        const sideTitle = document.getElementById("sidebarProjectTitle");
        if (sideTitle) sideTitle.textContent = "No Project Selected";
        const sideId = document.getElementById("sidebarProjectId");
        if (sideId) sideId.textContent = "--";
        window.location.href = "contractor-projects.html";
        return;
    }

    // Authoritative fetch from backend API
    const token = getCleanToken();
    try {
        const res = await fetch(`${API_BASE_URL}/api/contractor/projects/${encodeURIComponent(projectIdFromUrl)}`, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Authorization": token ? `Bearer ${token}` : ""
            }
        });

        if (res.ok) {
            const p = await res.json();
            const pId = p.projectId || (p.id ? `PRJ-${p.id}` : projectIdFromUrl);
            const pTitle = p.projectTitle || p.title || "BuildBid Project";
            const pType = p.projectType || p.type || "New Construction";
            const pArea = (p.builtUpArea || p.totalArea)
                ? `${p.builtUpArea || p.totalArea} sq.ft.`
                : (p.plotArea ? `${p.plotArea} sq.ft. (Plot)` : "--");
            const pFloors = p.floors ? String(p.floors) : "Ground + 1";
            const pLocation = p.location || (p.city ? `${p.city}, ${p.state || ""}` : "Location Not Specified");
            const pBudget = p.budget || (p.budgetMin && p.budgetMax
                ? `₹${p.budgetMin.toLocaleString("en-IN")} - ₹${p.budgetMax.toLocaleString("en-IN")}`
                : "Negotiable");

            let pRooms = p.interiorRooms || "--";
            if (p.details && p.details.rooms) {
                pRooms = typeof p.details.rooms === "object" ? JSON.stringify(p.details.rooms) : String(p.details.rooms);
            }

            let desc = p.description || "";
            if (p.scopeOfWork) {
                desc += (desc ? "\n\nScope of Work: " : "Scope of Work: ") + p.scopeOfWork;
            }
            if (p.details && typeof p.details === "object" && Object.keys(p.details).length > 0) {
                const techParts = [];
                if (p.details.purpose) techParts.push(`Purpose: ${p.details.purpose}`);
                if (p.details.plotFacing) techParts.push(`Plot Facing: ${p.details.plotFacing}`);
                if (p.details.hasBasement) techParts.push("Basement: Yes");
                if (p.details.propertyType) techParts.push(`Property Type: ${p.details.propertyType}`);
                if (techParts.length > 0) {
                    desc += "\n\nTechnical Specifications:\n" + techParts.join("\n");
                }
            }
            if (!desc) desc = "Customer project posted on BuildBid marketplace.";

            activeProject = {
                id: pId,
                title: pTitle,
                projectType: pType,
                area: pArea,
                floors: pFloors,
                location: pLocation,
                budget: pBudget,
                bedrooms: pRooms,
                bathrooms: (p.details && p.details.bathrooms) || "--",
                kitchen: (p.details && p.details.kitchen) || "--",
                parking: (p.details && p.details.parking) || "--",
                requirements: desc
            };
        } else if (res.status === 401) {
            alert("Session expired or unauthorized. Please log in as a verified Contractor.\nसत्र समाप्त। कृपया सत्यापित ठेकेदार के रूप में लॉगिन करें।");
            window.location.href = "index.html";
            return;
        } else if (res.status === 403) {
            alert("Access restricted: Verified contractor account required.\nपहुंच प्रतिबंधित: सत्यापित ठेकेदार खाता आवश्यक है।");
            window.location.href = "index.html";
            return;
        } else {
            console.error(`Failed to load project from server (Status: ${res.status})`);
            alert(`Project ${projectIdFromUrl} could not be loaded from database (${res.status}).`);
            return;
        }
    } catch (e) {
        console.error("Network error fetching project:", e);
        alert(`Network error: Unable to connect to server to load project ${projectIdFromUrl}.`);
        return;
    }

    if (!activeProject) {
        alert(`Authoritative project data unavailable for ${projectIdFromUrl}.`);
        return;
    }

    // Determine Project Mode
    detectProjectMode(activeProject.projectType);

    // Populate Sidebar & Step 1 Inputs dynamically (CUSTOMER REFERENCE DATA ONLY)
    const elSidebarTitle = document.getElementById("sidebarProjectTitle");
    if (elSidebarTitle) elSidebarTitle.textContent = activeProject.title || "Project";
    const elSidebarId = document.getElementById("sidebarProjectId");
    if (elSidebarId) elSidebarId.textContent = activeProject.id;

    const elDynId = document.getElementById("dynProjectId");
    if (elDynId) elDynId.value = activeProject.id;
    const elDynType = document.getElementById("dynProjectType");
    if (elDynType) elDynType.value = activeProject.projectType || "New Construction";
    const elDynArea = document.getElementById("dynArea");
    if (elDynArea) elDynArea.value = activeProject.area || "--";
    const elDynFloors = document.getElementById("dynFloors");
    if (elDynFloors) elDynFloors.value = activeProject.floors || "--";
    const elDynLoc = document.getElementById("dynLocation");
    if (elDynLoc) elDynLoc.value = activeProject.location || "Location Not Specified";
    const elDynBudget = document.getElementById("dynBudget");
    if (elDynBudget) elDynBudget.value = activeProject.budget || "Negotiable";

    const elDynBed = document.getElementById("dynBedrooms");
    if (elDynBed) elDynBed.value = activeProject.bedrooms || "--";
    const elDynBath = document.getElementById("dynBathrooms");
    if (elDynBath) elDynBath.value = activeProject.bathrooms || "--";
    const elDynKit = document.getElementById("dynKitchen");
    if (elDynKit) elDynKit.value = activeProject.kitchen || "--";
    const elDynPark = document.getElementById("dynParking");
    if (elDynPark) elDynPark.value = activeProject.parking || "--";
    const elDynReq = document.getElementById("dynRequirementsDesc");
    if (elDynReq) elDynReq.value = activeProject.requirements || "";

    const elBidTitle = document.getElementById("bidTitle");
    if (elBidTitle && !elBidTitle.value) {
        elBidTitle.value = `Quotation for ${activeProject.title}`;
    }

    // Apply Project-Type-Aware Step 3 Headers & Stepper Titles
    applyProjectTypeCustomizations();
}

function detectProjectMode(projectTypeStr) {
    const pt = (projectTypeStr || "").toLowerCase();
    if (pt.includes("renovat") || pt.includes("remodel")) {
        projectMode = "RENOVATION";
    } else if (pt.includes("extension")) {
        projectMode = "EXTENSION";
    } else if (pt.includes("interior") || pt.includes("finishing")) {
        projectMode = "INTERIOR";
    } else if (pt.includes("commercial")) {
        projectMode = "COMMERCIAL";
    } else if (pt.includes("industrial") || pt.includes("warehouse")) {
        projectMode = "INDUSTRIAL";
    } else if (pt.includes("other")) {
        projectMode = "OTHER";
    } else {
        projectMode = "NEW_CONSTRUCTION";
    }
}

function applyProjectTypeCustomizations() {
    const pill3Title = document.getElementById("pill-3") || document.getElementById("stepPill3Title");
    const step3Title = document.getElementById("step3Title");
    const step3Subtitle = document.getElementById("step3Subtitle");
    const btnAddFloor = document.getElementById("btnAddFloor");

    if (projectMode === "RENOVATION") {
        if (pill3Title) pill3Title.innerHTML = `3. Renovation Scope — नवीनीकरण कार्यक्षेत्र`;
        if (step3Title) step3Title.textContent = "Renovation Scope & Floor Cost — नवीनीकरण कार्यक्षेत्र एवं मंजिल लागत";
        if (step3Subtitle) step3Subtitle.textContent = "Itemized quotation for client's renovation floors/rooms. Excludes structural new-construction items. — ग्राहक के नवीनीकरण मंजिलों/कमरों के लिए कार्य-वार कोटेशन। नई संरचनात्मक मदें शामिल नहीं हैं।";
        if (btnAddFloor) btnAddFloor.innerHTML = `<i class="fa-solid fa-plus"></i> Add Renovation Area / Floor — नवीनीकरण क्षेत्र / मंजिल जोड़ें`;
    } else if (projectMode === "EXTENSION") {
        if (pill3Title) pill3Title.innerHTML = `3. Extension Scope — विस्तार कार्यक्षेत्र`;
        if (step3Title) step3Title.textContent = "Home Extension Cost Breakdown — होम एक्सटेंशन लागत विवरण";
        if (step3Subtitle) step3Subtitle.textContent = "Cost breakdown for structural extension, additions, and connecting works. — संरचनात्मक विस्तार और अतिरिक्त निर्माण कार्यों की लागत का विवरण।";
        if (btnAddFloor) btnAddFloor.innerHTML = `<i class="fa-solid fa-plus"></i> Add Extension Section — विस्तार अनुभाग जोड़ें`;
    } else if (projectMode === "INTERIOR") {
        if (pill3Title) pill3Title.innerHTML = `3. Interior Scope — इंटीरियर कार्यक्षेत्र`;
        if (step3Title) step3Title.textContent = "Interior & Finishing Breakdown — इंटीरियर एवं फिनिशिंग विवरण";
        if (step3Subtitle) step3Subtitle.textContent = "Room-by-room quotation for false ceiling, woodwork, flooring, and finishes. — फॉल्स सीलिंग, वुडवर्क, फ्लोरिंग और फिनिशिंग का कमरा-वार कोटेशन।";
        if (btnAddFloor) btnAddFloor.innerHTML = `<i class="fa-solid fa-plus"></i> Add Interior Zone — इंटीरियर ज़ोन जोड़ें`;
    } else if (projectMode === "COMMERCIAL") {
        if (pill3Title) pill3Title.innerHTML = `3. Commercial Breakdown — वाणिज्यिक विवरण`;
        if (step3Title) step3Title.textContent = "Commercial Construction Cost Breakdown — वाणिज्यिक निर्माण लागत विवरण";
        if (btnAddFloor) btnAddFloor.innerHTML = `<i class="fa-solid fa-plus"></i> Add Commercial Block/Floor — वाणिज्यिक ब्लॉक/मंजिल जोड़ें`;
    } else if (projectMode === "INDUSTRIAL") {
        if (pill3Title) pill3Title.innerHTML = `3. Industrial Breakdown — औद्योगिक विवरण`;
        if (step3Title) step3Title.textContent = "Industrial / Warehouse Breakdown — औद्योगिक / शेड विवरण";
        if (btnAddFloor) btnAddFloor.innerHTML = `<i class="fa-solid fa-plus"></i> Add Bay / Shed Section — बे / शेड सेक्शन जोड़ें`;
    } else if (projectMode === "OTHER") {
        if (pill3Title) pill3Title.innerHTML = `3. Custom Scope — कस्टम कार्यक्षेत्र`;
        if (step3Title) step3Title.textContent = "Custom Project Scope & Cost Breakdown — कस्टम परियोजना कार्यक्षेत्र एवं लागत विवरण";
        if (btnAddFloor) btnAddFloor.innerHTML = `<i class="fa-solid fa-plus"></i> Add Scope Section — कार्यक्षेत्र अनुभाग जोड़ें`;
    } else {
        // NEW_CONSTRUCTION
        if (pill3Title) pill3Title.innerHTML = `3. Scope — कार्यक्षेत्र`;
        if (step3Title) step3Title.textContent = "Floor-wise Cost Breakdown — मंजिल-वार लागत विवरण";
        if (step3Subtitle) step3Subtitle.textContent = "Breakdown of estimated costs across different floors for this project. — इस परियोजना के लिए विभिन्न मंजिलों पर अनुमानित लागत का विवरण।";
        if (btnAddFloor) btnAddFloor.innerHTML = `<i class="fa-solid fa-plus"></i> Add Floor Breakdown — नई मंजिल जोड़ें`;
    }
}

// 2. DEFAULT DYNAMIC TABLES SEEDING (STRICT NO PRE-FILLED QUOTATION DATA)
function populateDefaultDynamicTables() {
    const floorContainer = document.getElementById("floorsContainer");
    floorContainer.innerHTML = "";

    if (projectMode === "RENOVATION") {
        // Floor/Room-specific renovation cards tailored to customer requirement
        const rawFloors = (activeProject && activeProject.floors) ? String(activeProject.floors).toLowerCase() : "";
        if (rawFloors.includes("first") && rawFloors.includes("ground")) {
            addRenovationFloor("Ground Floor Renovation — भूतल नवीनीकरण");
            addRenovationFloor("First Floor Renovation — प्रथम तल नवीनीकरण");
        } else if (rawFloors.includes("first")) {
            addRenovationFloor("First Floor Renovation — प्रथम तल नवीनीकरण");
        } else if (rawFloors.includes("ground")) {
            addRenovationFloor("Ground Floor Renovation — भूतल नवीनीकरण");
        } else {
            addRenovationFloor("Renovation Scope Area 1 — नवीनीकरण कार्यक्षेत्र 1");
        }
    } else if (projectMode === "EXTENSION") {
        addExtensionFloor("Extension Work Section — विस्तार कार्य अनुभाग");
    } else if (projectMode === "INTERIOR") {
        addInteriorFloor("Interior & Finishing Zone 1 — इंटीरियर ज़ोन 1");
    } else {
        // NEW_CONSTRUCTION or default
        addFloor("Ground Floor — भूतल");
        addFloor("First Floor — प्रथम तल");
    }

    // Materials - Template rows with strictly EMPTY quantities and rates
    const matTable = document.querySelector("#materialsTable tbody");
    matTable.innerHTML = "";
    addMaterialRowData("Cement (OPC/PPC 53 Grade)", "Cement", "", "Bags", "", "UltraTech / ACC", "IS 12269", "Contractor");
    addMaterialRowData("TMT Reinforcement Steel (Fe 550D)", "TMT Steel", "", "Tons", "", "Tata Tiscon / Jindal", "IS 1786", "Contractor");
    addMaterialRowData("Red Clay Bricks / AAC Blocks", "Bricks", "", "Pcs", "", "Standard Grade", "Class 1", "Contractor");

    // Labour - Trade rows with strictly EMPTY workers, days, and rates
    const labTable = document.querySelector("#labourTable tbody");
    labTable.innerHTML = "";
    addLabourRowData("Mason — राजमिस्त्री", "", "", "", "Brickwork & plaster");
    addLabourRowData("Helper / Labour — मजदूर", "", "", "", "Material handling & curing");
    addLabourRowData("Bar Bender & Shuttering — शटरिंग कारीगर", "", "", "", "Framework & steel bending");

    // Construction Work - Category rows with strictly EMPTY quantities and rates
    const workTable = document.querySelector("#workTable tbody");
    workTable.innerHTML = "";
    if (projectMode === "RENOVATION") {
        addWorkRowData("Demolition & Prep", "Removal of existing fittings, debris clearance", "", "sq.ft.", "", "Site preparation");
        addWorkRowData("Finishing Work", "Tiling, skim coat plastering and repainting", "", "sq.ft.", "", "Surface finishing");
    } else {
        addWorkRowData("Excavation", "Site clearing and earth excavation for foundation", "", "sq.ft.", "", "Up to 5ft depth");
        addWorkRowData("RCC", "Slab casting and column shuttering work", "", "sq.ft.", "", "M20 Grade Mix");
    }

    // Equipment - Empty inputs
    const eqTable = document.querySelector("#equipmentTable tbody");
    eqTable.innerHTML = "";
    addEquipmentRowData("Concrete Mixer & Vibrator", "", "", "", "On-site slab casting");

    // Transport - Empty inputs
    const trTable = document.querySelector("#transportTable tbody");
    trTable.innerHTML = "";
    addTransportRowData("Material Transportation", "Bulk delivery of aggregate, sand and cement", "", "Trips", "", "Tipper Truck");

    // Other - Empty inputs
    const otherTable = document.querySelector("#otherTable tbody");
    otherTable.innerHTML = "";
    addOtherRowData("Site Setup & Storage", "Temporary shed, power arrangement and security", "", "Initial site preparation");

    // Payments - Percentage milestones start EMPTY so contractor enters their own schedule totaling 100%
    const payTable = document.querySelector("#paymentTable tbody");
    payTable.innerHTML = "";
    addPaymentRowData("Advance on Agreement — अनुबंध पर अग्रिम", "", "Mobilization advance");
    addPaymentRowData("Foundation / Plinth / Initial Phase — प्रारंभिक चरण", "", "Milestone stage 1");
    addPaymentRowData("Mid-stage Execution — मध्यवर्ती निर्माण", "", "Milestone stage 2");
    addPaymentRowData("Finishing & Installations — फिनिशिंग कार्य", "", "Milestone stage 3");
    addPaymentRowData("Final Handover & Clearance — अंतिम हैंडओवर", "", "Keys handover");

    // Warranty - Durations start EMPTY
    const warTable = document.querySelector("#warrantyTable tbody");
    warTable.innerHTML = "";
    addWarrantyRowData("Civil Work — सिविल कार्य", "", "Months", "Structural guarantee");
    addWarrantyRowData("Waterproofing — वॉटरप्रूफिंग", "", "Months", "Leakage guarantee");

    // Scope Inclusions & Exclusions - Default guideline items (contractor editable)
    const incList = document.getElementById("includedList");
    incList.innerHTML = "";
    addIncludedRowData("Execution strictly according to approved architectural drawings");
    addIncludedRowData("Standard safety measures and site maintenance during work");

    const excList = document.getElementById("excludedList");
    excList.innerHTML = "";
    addExcludedRowData("Government electricity meter & permanent water connection official charges");
    addExcludedRowData("Loose furniture, soft decor, and external municipal approvals");
}

// 3. SEQUENTIAL STEP LOCKING & VALIDATION ENGINE
function validateStep(stepNum) {
    if (stepNum === 1) {
        if (!activeProject || !activeProject.id) {
            return {
                valid: false,
                messageEn: "Project reference data is not loaded. Please select a valid project.",
                messageHi: "परियोजना संदर्भ डेटा लोड नहीं हुआ है। कृपया एक मान्य परियोजना चुनें।"
            };
        }
        return { valid: true };
    }

    if (stepNum === 2) {
        const title = (document.getElementById("bidTitle")?.value || "").trim();
        if (!title) {
            return {
                valid: false,
                messageEn: "Please enter Quotation Title in Proposal Details.",
                messageHi: "कृपया प्रस्ताव विवरण में कोटेशन शीर्षक दर्ज करें।"
            };
        }
        // NOTE: Descriptions (English & Hindi) and Bio are strictly OPTIONAL!
        return { valid: true };
    }

    if (stepNum === 3) {
        const cards = document.querySelectorAll("#floorsContainer .floor-card, #floorsContainer .renov-scope-card");
        if (cards.length === 0) {
            return {
                valid: false,
                messageEn: "Please configure at least one floor or renovation scope card.",
                messageHi: "कृपया कम से कम एक मंजिल या नवीनीकरण कार्यक्षेत्र कार्ड जोड़ें।"
            };
        }
        return { valid: true };
    }

    if (stepNum === 10) {
        const finalAmount = getFinalBid();
        if (finalAmount <= 0) {
            return {
                valid: false,
                messageEn: "Total quotation amount must be greater than zero. Please enter your rates.",
                messageHi: "कुल कोटेशन राशि शून्य से अधिक होनी चाहिए। कृपया अपनी दरें दर्ज करें।"
            };
        }
        return { valid: true };
    }

    if (stepNum === 11) {
        const start = document.getElementById("startDate")?.value;
        const duration = Number(document.getElementById("duration")?.value);
        if (!start) {
            return {
                valid: false,
                messageEn: "Please select an estimated project start date.",
                messageHi: "कृपया अनुमानित परियोजना प्रारंभ तिथि चुनें।"
            };
        }
        if (!duration || duration <= 0) {
            return {
                valid: false,
                messageEn: "Please enter a valid project duration in days.",
                messageHi: "कृपया दिनों में मान्य परियोजना अवधि दर्ज करें।"
            };
        }
        return { valid: true };
    }

    if (stepNum === 12) {
        const totalPct = calculatePaymentPercentage();
        if (totalPct !== 100) {
            return {
                valid: false,
                messageEn: `Payment milestone schedule must total exactly 100%. (Current total: ${totalPct}%)`,
                messageHi: `भुगतान मील का पत्थर अनुसूची का कुल योग ठीक 100% होना चाहिए। (वर्तमान कुल: ${totalPct}%)`
            };
        }
        return { valid: true };
    }

    if (stepNum === 17) {
        const confirmCb = document.getElementById("confirmTerms");
        if (confirmCb && !confirmCb.checked) {
            return {
                valid: false,
                messageEn: "Please confirm that the quotation information is accurate before submitting.",
                messageHi: "कृपया जमा करने से पहले पुष्टि करें कि कोटेशन की जानकारी सटीक है।"
            };
        }
        return { valid: true };
    }

    // Steps 4 to 9, 13 to 16 are optional or populated dynamically
    return { valid: true };
}

function canAccessStep(targetStep) {
    if (targetStep <= 1) return { allowed: true };

    for (let s = 1; s < targetStep; s++) {
        const check = validateStep(s);
        if (!check.valid) {
            return {
                allowed: false,
                blockingStep: s,
                messageEn: check.messageEn,
                messageHi: check.messageHi
            };
        }
    }
    return { allowed: true };
}

function showStepValidationBanner(stepNum, msgEn, msgHi) {
    const banner = document.getElementById("stepValidationBanner");
    if (!banner) return;
    banner.innerHTML = `
        <div class="banner-content">
            <div class="banner-title"><i class="fa-solid fa-triangle-exclamation"></i> Step ${stepNum} Incomplete — चरण ${stepNum} अपूर्ण है</div>
            <div class="banner-desc">${msgEn}<br><span class="label-hi">${msgHi}</span></div>
        </div>
        <button class="banner-close" type="button" onclick="hideStepValidationBanner()">&times;</button>
    `;
    banner.style.display = "flex";
    banner.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideStepValidationBanner() {
    const banner = document.getElementById("stepValidationBanner");
    if (banner) banner.style.display = "none";
}

// 4. NAVIGATION CONTROLS & STEPPER UI
function goToStep(step) {
    if (step < 1 || step > totalSteps) return;

    // Sequential Step Locking: Validate previous steps before jumping forward
    if (step > currentStep) {
        const check = canAccessStep(step);
        if (!check.allowed) {
            showStepValidationBanner(check.blockingStep, check.messageEn, check.messageHi);
            return;
        }
    }

    hideStepValidationBanner();

    document.querySelectorAll(".bid-section").forEach(s => s.classList.remove("active"));
    const targetSection = document.getElementById("step" + step);
    if (targetSection) targetSection.classList.add("active");

    currentStep = step;
    updateProgress();
    updateStepperUI();
    updateNavigation();

    if (step === 17) updateReview();

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function tryGoToStep(step) {
    goToStep(step);
}
if (typeof window !== "undefined") {
    window.tryGoToStep = goToStep;
}

function nextStep() {
    const check = canAccessStep(currentStep + 1);
    if (!check.allowed) {
        showStepValidationBanner(check.blockingStep, check.messageEn, check.messageHi);
        return;
    }
    if (currentStep < totalSteps) {
        goToStep(currentStep + 1);
    }
}

function previousStep() {
    if (currentStep > 1) {
        goToStep(currentStep - 1);
    }
}

function updateStepperUI() {
    const pills = document.querySelectorAll(".step-pill");
    pills.forEach((item, index) => {
        const stepNum = index + 1;
        item.classList.remove("active", "completed", "locked");

        if (stepNum < currentStep) {
            item.classList.add("completed");
        } else if (stepNum === currentStep) {
            item.classList.add("active");
        } else {
            // Check if this upcoming step is locked
            const access = canAccessStep(stepNum);
            if (!access.allowed) {
                item.classList.add("locked");
            }
        }
    });
}

function updateProgress() {
    const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
    const bar = document.getElementById("progressBar");
    if (bar) bar.style.width = percentage + "%";
}

function updateNavigation() {
    const nextButton = document.getElementById("nextButton");
    const submitButton = document.getElementById("submitButton");
    if (currentStep === totalSteps) {
        if (nextButton) nextButton.style.display = "none";
        if (submitButton) submitButton.style.display = "block";
    } else {
        if (nextButton) nextButton.style.display = "block";
        if (submitButton) submitButton.style.display = "none";
    }
}

function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("open");
}

function formatCurrency(val) {
    return "₹" + (Number(val) || 0).toLocaleString("en-IN");
}

function parseCurrency(val) {
    if (!val) return 0;
    return Number(String(val).replace(/[₹,]/g, "")) || 0;
}

function removeElement(button) {
    const row = button.closest("tr") || button.closest(".floor-card") || button.closest(".renov-scope-card") || button.closest(".form-group");
    if (row) row.remove();
    calculateTotals();
    calculatePayments();
}

// 5. PROJECT-TYPE-AWARE FLOOR & SCOPE BUILDERS
function addFloor(name, area, fnd, rcc, msn, pls, flr, elc, plm, pnt, wtp) {
    const container = document.getElementById("floorsContainer");
    const count = container.querySelectorAll(".floor-card, .renov-scope-card").length + 1;
    const div = document.createElement("div");
    div.className = "floor-card";
    div.innerHTML = `
        <div class="floor-header">
            <h4>${name || "Floor " + count}</h4>
            <button type="button" class="btn btn-danger" onclick="removeElement(this)">Remove — हटाएं</button>
        </div>
        <div class="ref-notice-badge">
            <i class="fa-solid fa-circle-info"></i> Customer Reference: New Construction. Enter your competitive quotation rates below. — नई निर्माण परियोजना। नीचे अपनी दरें दर्ज करें।
        </div>
        <div class="grid-4">
            <div class="form-group"><label class="bilingual-label">Area (sq.ft.) <span class="label-hi">क्षेत्रफल</span></label><input type="number" class="floor-area" value="${area || ''}" placeholder="e.g. 1000" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Foundation Cost <span class="label-hi">नींव लागत</span></label><input type="number" class="floor-cost" value="${fnd || ''}" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">RCC Framing <span class="label-hi">आरसीसी ढांचा</span></label><input type="number" class="floor-cost" value="${rcc || ''}" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Masonry / Brickwork <span class="label-hi">चिनाई कार्य</span></label><input type="number" class="floor-cost" value="${msn || ''}" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Plaster Work <span class="label-hi">प्लास्टर कार्य</span></label><input type="number" class="floor-cost" value="${pls || ''}" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Flooring Work <span class="label-hi">फ्लोरिंग कार्य</span></label><input type="number" class="floor-cost" value="${flr || ''}" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Electrical Work <span class="label-hi">विद्युत कार्य</span></label><input type="number" class="floor-cost" value="${elc || ''}" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Plumbing Work <span class="label-hi">प्लंबिंग कार्य</span></label><input type="number" class="floor-cost" value="${plm || ''}" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Painting Work <span class="label-hi">पेंटिंग कार्य</span></label><input type="number" class="floor-cost" value="${pnt || ''}" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Waterproofing <span class="label-hi">वॉटरप्रूफिंग</span></label><input type="number" class="floor-cost" value="${wtp || ''}" placeholder="0" oninput="calculateTotals()"></div>
        </div>
    `;
    container.appendChild(div);
    calculateTotals();
}

// Renovation & Remodeling Special Card Builder
function addRenovationFloor(name, area) {
    const container = document.getElementById("floorsContainer");
    const count = container.querySelectorAll(".floor-card, .renov-scope-card").length + 1;
    const div = document.createElement("div");
    div.className = "renov-scope-card";
    div.innerHTML = `
        <div class="floor-header">
            <h4>${name || "Renovation Scope " + count}</h4>
            <span class="renov-scope-badge"><i class="fa-solid fa-screwdriver-wrench"></i> Renovation Scope</span>
            <button type="button" class="btn btn-danger" onclick="removeElement(this)">Remove — हटाएं</button>
        </div>
        <div class="ref-notice-badge">
            <i class="fa-solid fa-circle-info"></i> Customer Requirement Reference: Renovation work for this area. Enter your competitive quotation rates below. (No structural foundation items). — ग्राहक आवश्यकता संदर्भ: इस क्षेत्र के लिए नवीनीकरण कार्य। नीचे अपनी दरें दर्ज करें।
        </div>
        <div class="grid-4">
            <div class="form-group"><label class="bilingual-label">Renovation Area (sq.ft.) <span class="label-hi">नवीनीकरण क्षेत्रफल</span></label><input type="number" class="floor-area" value="${area || ''}" placeholder="e.g. 800" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Demolition & Debris <span class="label-hi">तोड़फोड़ एवं मलबा</span></label><input type="number" class="floor-cost" value="" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Plaster & Wall Repair <span class="label-hi">प्लास्टर एवं दीवार मरम्मत</span></label><input type="number" class="floor-cost" value="" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Flooring Replacement <span class="label-hi">फ्लोरिंग कार्य</span></label><input type="number" class="floor-cost" value="" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Painting & Wall Finish <span class="label-hi">पेंटिंग एवं फिनिश</span></label><input type="number" class="floor-cost" value="" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Electrical & Fixtures <span class="label-hi">विद्युत कार्य</span></label><input type="number" class="floor-cost" value="" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Plumbing & Sanitary <span class="label-hi">प्लंबिंग एवं सेनेटरी</span></label><input type="number" class="floor-cost" value="" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Doors & Windows <span class="label-hi">दरवाजे एवं खिड़कियां</span></label><input type="number" class="floor-cost" value="" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">False Ceiling Work <span class="label-hi">फॉल्स सीलिंग</span></label><input type="number" class="floor-cost" value="" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Waterproofing Work <span class="label-hi">वॉटरप्रूफिंग</span></label><input type="number" class="floor-cost" value="" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Kitchen / Bath Remodel <span class="label-hi">रसोई / बाथरूम नवीनीकरण</span></label><input type="number" class="floor-cost" value="" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Other Renovation Work <span class="label-hi">अन्य नवीनीकरण कार्य</span></label><input type="number" class="floor-cost" value="" placeholder="0" oninput="calculateTotals()"></div>
        </div>
    `;
    container.appendChild(div);
    calculateTotals();
}

function addExtensionFloor(name) {
    const container = document.getElementById("floorsContainer");
    const count = container.querySelectorAll(".floor-card, .renov-scope-card").length + 1;
    const div = document.createElement("div");
    div.className = "renov-scope-card";
    div.innerHTML = `
        <div class="floor-header">
            <h4>${name || "Extension Section " + count}</h4>
            <button type="button" class="btn btn-danger" onclick="removeElement(this)">Remove — हटाएं</button>
        </div>
        <div class="ref-notice-badge">
            <i class="fa-solid fa-circle-info"></i> Home Extension Scope: Specify extension structural & finishing rates. — विस्तार कार्यक्षेत्र: संरचनात्मक एवं फिनिशिंग दरें दर्ज करें।
        </div>
        <div class="grid-4">
            <div class="form-group"><label class="bilingual-label">Extension Area (sq.ft.) <span class="label-hi">विस्तार क्षेत्रफल</span></label><input type="number" class="floor-area" value="" placeholder="e.g. 500" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Structural / Framing <span class="label-hi">ढांचा निर्माण</span></label><input type="number" class="floor-cost" value="" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Masonry & Walls <span class="label-hi">दीवार चिनाई</span></label><input type="number" class="floor-cost" value="" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Roofing / Slab <span class="label-hi">छत / स्लैब</span></label><input type="number" class="floor-cost" value="" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Flooring & Plaster <span class="label-hi">फ्लोरिंग एवं प्लास्टर</span></label><input type="number" class="floor-cost" value="" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Electrical & Plumbing <span class="label-hi">विद्युत एवं प्लंबिंग</span></label><input type="number" class="floor-cost" value="" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Painting & Waterproofing <span class="label-hi">पेंटिंग एवं वॉटरप्रूफिंग</span></label><input type="number" class="floor-cost" value="" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Integration & Other <span class="label-hi">अन्य एकीकरण कार्य</span></label><input type="number" class="floor-cost" value="" placeholder="0" oninput="calculateTotals()"></div>
        </div>
    `;
    container.appendChild(div);
    calculateTotals();
}

function addInteriorFloor(name) {
    const container = document.getElementById("floorsContainer");
    const count = container.querySelectorAll(".floor-card, .renov-scope-card").length + 1;
    const div = document.createElement("div");
    div.className = "renov-scope-card";
    div.innerHTML = `
        <div class="floor-header">
            <h4>${name || "Interior Zone " + count}</h4>
            <button type="button" class="btn btn-danger" onclick="removeElement(this)">Remove — हटाएं</button>
        </div>
        <div class="ref-notice-badge">
            <i class="fa-solid fa-circle-info"></i> Interior & Finishing Scope: Enter quotation for interior woodwork, false ceiling & fittings. — इंटीरियर कार्यक्षेत्र: वुडवर्क, फॉल्स सीलिंग एवं फिटिंग्स दरें दर्ज करें।
        </div>
        <div class="grid-4">
            <div class="form-group"><label class="bilingual-label">Zone Area (sq.ft.) <span class="label-hi">ज़ोन क्षेत्रफल</span></label><input type="number" class="floor-area" value="" placeholder="e.g. 400" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">False Ceiling & Lighting <span class="label-hi">फॉल्स सीलिंग एवं लाइटिंग</span></label><input type="number" class="floor-cost" value="" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Woodwork & Cabinetry <span class="label-hi">अलमारी एवं वुडवर्क</span></label><input type="number" class="floor-cost" value="" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Flooring / Paneling <span class="label-hi">फ्लोरिंग / वॉल पैनलिंग</span></label><input type="number" class="floor-cost" value="" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Wall Painting & Textures <span class="label-hi">पेंटिंग एवं वॉल टेक्सचर</span></label><input type="number" class="floor-cost" value="" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Electrical & Fixtures <span class="label-hi">विद्युत उपकरण एवं फिटिंग्स</span></label><input type="number" class="floor-cost" value="" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Hardware & Glass <span class="label-hi">हार्डवेयर एवं ग्लास</span></label><input type="number" class="floor-cost" value="" placeholder="0" oninput="calculateTotals()"></div>
            <div class="form-group"><label class="bilingual-label">Other Finishing Work <span class="label-hi">अन्य फिनिशिंग कार्य</span></label><input type="number" class="floor-cost" value="" placeholder="0" oninput="calculateTotals()"></div>
        </div>
    `;
    container.appendChild(div);
    calculateTotals();
}

// Handler for the "Add Floor" button based on project type
function handleAddFloorClick() {
    if (projectMode === "RENOVATION") {
        addRenovationFloor();
    } else if (projectMode === "EXTENSION") {
        addExtensionFloor();
    } else if (projectMode === "INTERIOR") {
        addInteriorFloor();
    } else {
        addFloor();
    }
}

function calculateTotals() {
    let total = 0;
    document.querySelectorAll(".floor-card .floor-cost, .renov-scope-card .floor-cost").forEach(input => {
        total += Number(input.value) || 0;
    });
    document.getElementById("floorTotal").textContent = formatCurrency(total);
    calculateFinalBid();
}

// 6. MATERIALS
function addMaterialRowData(name, cat, qty, unit, rate, brand, spec, prov) {
    const tbody = document.querySelector("#materialsTable tbody");
    const row = document.createElement("tr");
    const amount = ((qty !== "" && rate !== "") ? (Number(qty) * Number(rate)) : 0);
    row.innerHTML = `
        <td><input value="${name || ''}" placeholder="Material Name"></td>
        <td>
            <select>
                <option ${cat === 'Cement' ? 'selected' : ''}>Cement</option>
                <option ${cat === 'TMT Steel' ? 'selected' : ''}>TMT Steel</option>
                <option ${cat === 'Bricks' ? 'selected' : ''}>Bricks</option>
                <option ${cat === 'Sand' ? 'selected' : ''}>Sand</option>
                <option ${cat === 'Aggregate' ? 'selected' : ''}>Aggregate</option>
                <option ${cat === 'Electrical' ? 'selected' : ''}>Electrical</option>
                <option ${cat === 'Plumbing' ? 'selected' : ''}>Plumbing</option>
                <option ${cat === 'Finishing' ? 'selected' : ''}>Finishing</option>
                <option ${cat === 'Other' ? 'selected' : ''}>Other</option>
            </select>
        </td>
        <td><input type="number" class="material-qty" value="${qty !== undefined && qty !== null ? qty : ''}" placeholder="0" oninput="calculateMaterial(this)"></td>
        <td><input value="${unit || 'Units'}" placeholder="Unit"></td>
        <td><input type="number" class="material-rate" value="${rate !== undefined && rate !== null ? rate : ''}" placeholder="0" oninput="calculateMaterial(this)"></td>
        <td><input class="material-amount" value="${amount > 0 ? formatCurrency(amount) : ''}" placeholder="₹0" readonly></td>
        <td><input value="${brand || ''}" placeholder="Brand"></td>
        <td><input value="${spec || ''}" placeholder="Specification"></td>
        <td>
            <select>
                <option ${prov === 'Contractor' ? 'selected' : ''}>Contractor</option>
                <option ${prov === 'Customer' ? 'selected' : ''}>Customer</option>
            </select>
        </td>
        <td><button type="button" class="btn btn-danger" onclick="removeElement(this)">×</button></td>
    `;
    tbody.appendChild(row);
}

function addMaterial() { addMaterialRowData(); }

function calculateMaterial(input) {
    const row = input.closest("tr");
    const qty = Number(row.querySelector(".material-qty").value) || 0;
    const rate = Number(row.querySelector(".material-rate").value) || 0;
    const amtInp = row.querySelector(".material-amount");
    amtInp.value = (qty && rate) ? formatCurrency(qty * rate) : "";
    calculateMaterialTotal();
}

function calculateMaterialTotal() {
    let total = 0;
    document.querySelectorAll(".material-amount").forEach(inp => total += parseCurrency(inp.value));
    document.getElementById("materialTotal").textContent = formatCurrency(total);
    calculateFinalBid();
}

// 7. LABOUR
function addLabourRowData(trade, workers, days, rate, notes) {
    const tbody = document.querySelector("#labourTable tbody");
    const row = document.createElement("tr");
    const amount = ((workers !== "" && days !== "" && rate !== "") ? (Number(workers) * Number(days) * Number(rate)) : 0);
    row.innerHTML = `
        <td><input value="${trade || ''}" placeholder="Trade"></td>
        <td><input type="number" class="labour-workers" value="${workers !== undefined && workers !== null ? workers : ''}" placeholder="0" oninput="calculateLabour(this)"></td>
        <td><input type="number" class="labour-days" value="${days !== undefined && days !== null ? days : ''}" placeholder="0" oninput="calculateLabour(this)"></td>
        <td><input type="number" class="labour-rate" value="${rate !== undefined && rate !== null ? rate : ''}" placeholder="0" oninput="calculateLabour(this)"></td>
        <td><input class="labour-amount" value="${amount > 0 ? formatCurrency(amount) : ''}" placeholder="₹0" readonly></td>
        <td><input value="${notes || ''}" placeholder="Notes"></td>
        <td><button type="button" class="btn btn-danger" onclick="removeElement(this)">×</button></td>
    `;
    tbody.appendChild(row);
}

function addLabour() { addLabourRowData(); }

function calculateLabour(input) {
    const row = input.closest("tr");
    const w = Number(row.querySelector(".labour-workers").value) || 0;
    const d = Number(row.querySelector(".labour-days").value) || 0;
    const r = Number(row.querySelector(".labour-rate").value) || 0;
    const amtInp = row.querySelector(".labour-amount");
    amtInp.value = (w && d && r) ? formatCurrency(w * d * r) : "";
    calculateLabourTotal();
}

function calculateLabourTotal() {
    let total = 0;
    document.querySelectorAll(".labour-amount").forEach(inp => total += parseCurrency(inp.value));
    document.getElementById("labourTotal").textContent = formatCurrency(total);
    calculateFinalBid();
}

// 8. WORK, EQUIPMENT, TRANSPORT, OTHER
function addWorkRowData(cat, desc, qty, unit, rate, notes) {
    const tbody = document.querySelector("#workTable tbody");
    const row = document.createElement("tr");
    const amount = ((qty !== "" && rate !== "") ? (Number(qty) * Number(rate)) : 0);
    row.innerHTML = `
        <td><input value="${cat || ''}" placeholder="Category"></td>
        <td><input value="${desc || ''}" placeholder="Work Description"></td>
        <td><input type="number" class="work-qty" value="${qty !== undefined && qty !== null ? qty : ''}" placeholder="0" oninput="calculateWork(this)"></td>
        <td><input value="${unit || 'sq.ft.'}"></td>
        <td><input type="number" class="work-rate" value="${rate !== undefined && rate !== null ? rate : ''}" placeholder="0" oninput="calculateWork(this)"></td>
        <td><input class="work-amount" value="${amount > 0 ? formatCurrency(amount) : ''}" placeholder="₹0" readonly></td>
        <td><input value="${notes || ''}" placeholder="Notes"></td>
        <td><button type="button" class="btn btn-danger" onclick="removeElement(this)">×</button></td>
    `;
    tbody.appendChild(row);
}

function addWork() { addWorkRowData(); }

function calculateWork(input) {
    const row = input.closest("tr");
    const q = Number(row.querySelector(".work-qty").value) || 0;
    const r = Number(row.querySelector(".work-rate").value) || 0;
    const amtInp = row.querySelector(".work-amount");
    amtInp.value = (q && r) ? formatCurrency(q * r) : "";
    calculateFinalBid();
}

function calculateWorkTotal() {
    let total = 0;
    document.querySelectorAll(".work-amount").forEach(i => total += parseCurrency(i.value));
    return total;
}

function addEquipmentRowData(name, qty, days, rate, notes) {
    const tbody = document.querySelector("#equipmentTable tbody");
    const row = document.createElement("tr");
    const amount = ((qty !== "" && days !== "" && rate !== "") ? (Number(qty) * Number(days) * Number(rate)) : 0);
    row.innerHTML = `
        <td><input value="${name || ''}" placeholder="Equipment Name"></td>
        <td><input type="number" class="equipment-qty" value="${qty !== undefined && qty !== null ? qty : ''}" placeholder="0" oninput="calculateEquipment(this)"></td>
        <td><input type="number" class="equipment-days" value="${days !== undefined && days !== null ? days : ''}" placeholder="0" oninput="calculateEquipment(this)"></td>
        <td><input type="number" class="equipment-rate" value="${rate !== undefined && rate !== null ? rate : ''}" placeholder="0" oninput="calculateEquipment(this)"></td>
        <td><input class="equipment-amount" value="${amount > 0 ? formatCurrency(amount) : ''}" placeholder="₹0" readonly></td>
        <td><input value="${notes || ''}" placeholder="Notes"></td>
        <td><button type="button" class="btn btn-danger" onclick="removeElement(this)">×</button></td>
    `;
    tbody.appendChild(row);
}

function addEquipment() { addEquipmentRowData(); }

function calculateEquipment(input) {
    const row = input.closest("tr");
    const q = Number(row.querySelector(".equipment-qty").value) || 0;
    const d = Number(row.querySelector(".equipment-days").value) || 0;
    const r = Number(row.querySelector(".equipment-rate").value) || 0;
    const amtInp = row.querySelector(".equipment-amount");
    amtInp.value = (q && d && r) ? formatCurrency(q * d * r) : "";
    calculateFinalBid();
}

function calculateEquipmentTotal() {
    let total = 0;
    document.querySelectorAll(".equipment-amount").forEach(i => total += parseCurrency(i.value));
    return total;
}

function addTransportRowData(type, desc, qty, unit, rate, notes) {
    const tbody = document.querySelector("#transportTable tbody");
    const row = document.createElement("tr");
    const amount = ((qty !== "" && rate !== "") ? (Number(qty) * Number(rate)) : 0);
    row.innerHTML = `
        <td><input value="${type || ''}" placeholder="Type"></td>
        <td><input value="${desc || ''}" placeholder="Description"></td>
        <td><input type="number" class="transport-qty" value="${qty !== undefined && qty !== null ? qty : ''}" placeholder="0" oninput="calculateTransport(this)"></td>
        <td><input value="${unit || 'Trips'}"></td>
        <td><input type="number" class="transport-rate" value="${rate !== undefined && rate !== null ? rate : ''}" placeholder="0" oninput="calculateTransport(this)"></td>
        <td><input class="transport-amount" value="${amount > 0 ? formatCurrency(amount) : ''}" placeholder="₹0" readonly></td>
        <td><input value="${notes || ''}" placeholder="Notes"></td>
        <td><button type="button" class="btn btn-danger" onclick="removeElement(this)">×</button></td>
    `;
    tbody.appendChild(row);
}

function addTransport() { addTransportRowData(); }

function calculateTransport(input) {
    const row = input.closest("tr");
    const q = Number(row.querySelector(".transport-qty").value) || 0;
    const r = Number(row.querySelector(".transport-rate").value) || 0;
    const amtInp = row.querySelector(".transport-amount");
    amtInp.value = (q && r) ? formatCurrency(q * r) : "";
    calculateFinalBid();
}

function calculateTransportTotal() {
    let total = 0;
    document.querySelectorAll(".transport-amount").forEach(i => total += parseCurrency(i.value));
    return total;
}

function addOtherRowData(name, desc, amt, notes) {
    const tbody = document.querySelector("#otherTable tbody");
    const row = document.createElement("tr");
    row.innerHTML = `
        <td><input value="${name || ''}" placeholder="Cost Name"></td>
        <td><input value="${desc || ''}" placeholder="Description"></td>
        <td><input type="number" class="other-amount-input" value="${amt !== undefined && amt !== null ? amt : ''}" placeholder="0" oninput="calculateOther()"></td>
        <td><input value="${notes || ''}" placeholder="Notes"></td>
        <td><button type="button" class="btn btn-danger" onclick="removeElement(this)">×</button></td>
    `;
    tbody.appendChild(row);
}

function addOther() { addOtherRowData(); }

function calculateOther() { calculateFinalBid(); }

function calculateOtherTotal() {
    let total = 0;
    document.querySelectorAll(".other-amount-input").forEach(i => total += Number(i.value) || 0);
    return total;
}

// 9. FINAL BID CALCULATION
function getFloorTotal() {
    return parseCurrency(document.getElementById("floorTotal").textContent);
}

function calculateFinalBid() {
    const floors = getFloorTotal();
    const materials = parseCurrency(document.getElementById("materialTotal").textContent);
    const labour = parseCurrency(document.getElementById("labourTotal").textContent);
    const work = calculateWorkTotal();
    const equipment = calculateEquipmentTotal();
    const transport = calculateTransportTotal();
    const other = calculateOtherTotal();

    const direct = floors + materials + labour + work + equipment + transport + other;
    const commercial = Number(document.getElementById("commercialAdjustment")?.value) || 0;
    const taxRate = Number(document.getElementById("taxRate")?.value) || 0;

    const taxable = direct + commercial;
    const tax = taxable * taxRate / 100;
    const final = taxable + tax;

    const elPriceFloor = document.getElementById("priceFloor");
    if (elPriceFloor) elPriceFloor.textContent = formatCurrency(floors);
    const elPriceMat = document.getElementById("priceMaterial");
    if (elPriceMat) elPriceMat.textContent = formatCurrency(materials);
    const elPriceLab = document.getElementById("priceLabour");
    if (elPriceLab) elPriceLab.textContent = formatCurrency(labour);
    const elPriceWork = document.getElementById("priceWork");
    if (elPriceWork) elPriceWork.textContent = formatCurrency(work);
    const elPriceEq = document.getElementById("priceEquipment");
    if (elPriceEq) elPriceEq.textContent = formatCurrency(equipment);
    const elPriceTr = document.getElementById("priceTransport");
    if (elPriceTr) elPriceTr.textContent = formatCurrency(transport);
    const elPriceOth = document.getElementById("priceOther");
    if (elPriceOth) elPriceOth.textContent = formatCurrency(other);

    const elDirect = document.getElementById("directCost");
    if (elDirect) elDirect.textContent = formatCurrency(direct);
    const elCommDirect = document.getElementById("commercialDirect");
    if (elCommDirect) elCommDirect.textContent = formatCurrency(direct);
    const elCommVal = document.getElementById("commercialValue");
    if (elCommVal) elCommVal.textContent = formatCurrency(commercial);
    const elTaxVal = document.getElementById("taxValue");
    if (elTaxVal) elTaxVal.textContent = formatCurrency(tax);
    const elFinalBid = document.getElementById("finalBid");
    if (elFinalBid) elFinalBid.textContent = formatCurrency(final);
}

function getFinalBid() {
    return parseCurrency(document.getElementById("finalBid").textContent);
}

// 10. TIMELINE & PAYMENTS
function calculateCompletion() {
    const start = document.getElementById("startDate")?.value;
    const duration = Number(document.getElementById("duration")?.value);
    const compEl = document.getElementById("completionDate");
    if (!start || !duration) {
        if (compEl) compEl.value = "";
        return;
    }
    const date = new Date(start);
    date.setDate(date.getDate() + duration);
    if (compEl) compEl.value = date.toISOString().split("T")[0];
}

function addPaymentRowData(name, pct, desc) {
    const tbody = document.querySelector("#paymentTable tbody");
    const row = document.createElement("tr");
    row.innerHTML = `
        <td><input value="${name || ''}" placeholder="Milestone Name"></td>
        <td><input type="number" value="${pct !== undefined && pct !== null ? pct : ''}" class="payment-percent" placeholder="0" oninput="calculatePayments()"></td>
        <td><input class="payment-amount" placeholder="₹0" readonly></td>
        <td><input value="${desc || ''}" placeholder="Description"></td>
        <td><button type="button" class="btn btn-danger" onclick="removeElement(this);calculatePayments()">×</button></td>
    `;
    tbody.appendChild(row);
}

function addPayment() { addPaymentRowData(); }

function calculatePaymentPercentage() {
    let total = 0;
    document.querySelectorAll(".payment-percent").forEach(i => total += Number(i.value) || 0);
    return total;
}

function calculatePayments() {
    const final = getFinalBid();
    let total = 0;
    document.querySelectorAll("#paymentTable tbody tr").forEach(row => {
        const pctInp = row.querySelector(".payment-percent");
        const pct = Number(pctInp?.value) || 0;
        const amtInp = row.querySelector(".payment-amount");
        if (amtInp) {
            amtInp.value = (final > 0 && pct > 0) ? formatCurrency(final * pct / 100) : "";
        }
        total += pct;
    });

    const box = document.getElementById("paymentTotalBox");
    if (box) {
        box.textContent = `Total Payment Schedule: ${total}% — कुल भुगतान अनुसूची: ${total}%`;
        box.className = total === 100 ? "payment-total valid" : "payment-total invalid";
    }
}

// 11. WARRANTY, INCLUSIONS & EXCLUSIONS
function addWarrantyRowData(cat, dur, unit, desc) {
    const tbody = document.querySelector("#warrantyTable tbody");
    const row = document.createElement("tr");
    row.innerHTML = `
        <td><input value="${cat || 'Civil Work'}"></td>
        <td><input type="number" value="${dur !== undefined && dur !== null ? dur : ''}" placeholder="0"></td>
        <td><input value="${unit || 'Months'}"></td>
        <td><input value="${desc || ''}" placeholder="Warranty Details"></td>
        <td><button type="button" class="btn btn-danger" onclick="removeElement(this)">×</button></td>
    `;
    tbody.appendChild(row);
}

function addWarranty() { addWarrantyRowData(); }

function addIncludedRowData(text) {
    const list = document.getElementById("includedList");
    const div = document.createElement("div");
    div.className = "form-group";
    div.innerHTML = `<input value="${text || ''}" placeholder="Included Work Item">`;
    list.appendChild(div);
}

function addIncluded() { addIncludedRowData(); }

function addExcludedRowData(text) {
    const list = document.getElementById("excludedList");
    const div = document.createElement("div");
    div.className = "form-group";
    div.innerHTML = `<input value="${text || ''}" placeholder="Excluded Work Item">`;
    list.appendChild(div);
}

function addExcluded() { addExcludedRowData(); }

// 12. REVIEW & SUBMISSION
function updateReview() {
    calculateFinalBid();
    document.getElementById("reviewProjectName").textContent = activeProject ? (activeProject.title || activeProject.id) : "Customer Project";
    const nameDisplay = document.getElementById("top-nav-name") || document.getElementById("contractorNameDisplay");
    document.getElementById("reviewContractorName").textContent = nameDisplay ? nameDisplay.textContent : "Contractor";
    document.getElementById("reviewBidTitle").textContent = document.getElementById("bidTitle")?.value || "Contractor Proposal";
    const durVal = document.getElementById("duration")?.value;
    document.getElementById("reviewDuration").textContent = durVal ? (durVal + " Days") : "--";

    document.getElementById("reviewFloor").textContent = formatCurrency(getFloorTotal());
    document.getElementById("reviewMaterial").textContent = document.getElementById("materialTotal")?.textContent || "₹0";
    document.getElementById("reviewLabour").textContent = document.getElementById("labourTotal")?.textContent || "₹0";
    document.getElementById("reviewWork").textContent = formatCurrency(calculateWorkTotal());
    document.getElementById("reviewEquipment").textContent = formatCurrency(calculateEquipmentTotal());
    document.getElementById("reviewTransport").textContent = formatCurrency(calculateTransportTotal());
    document.getElementById("reviewOther").textContent = formatCurrency(calculateOtherTotal());
    document.getElementById("reviewFinal").textContent = formatCurrency(getFinalBid());

    // Review descriptions
    const descEn = (document.getElementById("bidDescEn")?.value || "").trim();
    const descHi = (document.getElementById("bidDescHi")?.value || "").trim();
    const rowEn = document.getElementById("reviewDescEnRow");
    const valEn = document.getElementById("reviewDescEn");
    if (rowEn && valEn) {
        if (descEn) {
            rowEn.style.display = "flex";
            valEn.textContent = descEn;
        } else {
            rowEn.style.display = "none";
        }
    }
    const rowHi = document.getElementById("reviewDescHiRow");
    const valHi = document.getElementById("reviewDescHi");
    if (rowHi && valHi) {
        if (descHi) {
            rowHi.style.display = "flex";
            valHi.textContent = descHi;
        } else {
            rowHi.style.display = "none";
        }
    }
}

function saveDraft() {
    const bidData = {
        status: "DRAFT",
        projectId: activeProject ? activeProject.id : "PRJ-UNKNOWN",
        bidTitle: document.getElementById("bidTitle")?.value || "",
        descriptionEn: (document.getElementById("bidDescEn")?.value || "").trim(),
        descriptionHi: (document.getElementById("bidDescHi")?.value || "").trim(),
        duration: document.getElementById("duration")?.value || "",
        startDate: document.getElementById("startDate")?.value || "",
        commercialAdjustment: document.getElementById("commercialAdjustment")?.value || "",
        finalAmount: getFinalBid(),
        savedAt: new Date().toISOString()
    };
    localStorage.setItem("buildBidDraft_" + bidData.projectId, JSON.stringify(bidData));
    alert("Draft saved successfully for this project. — इस परियोजना के लिए ड्राफ्ट सफलतापूर्वक सहेजा गया।");
}

function loadDraftIfAvailable() {
    if (!activeProject || !activeProject.id) return;
    try {
        const raw = localStorage.getItem("buildBidDraft_" + activeProject.id);
        if (!raw) return;
        const draft = JSON.parse(raw);
        if (draft.bidTitle) {
            const el = document.getElementById("bidTitle");
            if (el) el.value = draft.bidTitle;
        }
        if (draft.descriptionEn) {
            const el = document.getElementById("bidDescEn");
            if (el) el.value = draft.descriptionEn;
        }
        if (draft.descriptionHi) {
            const el = document.getElementById("bidDescHi");
            if (el) el.value = draft.descriptionHi;
        }
        if (draft.duration) {
            const el = document.getElementById("duration");
            if (el) el.value = draft.duration;
            calculateCompletion();
        }
        if (draft.startDate) {
            const el = document.getElementById("startDate");
            if (el) el.value = draft.startDate;
            calculateCompletion();
        }
        if (draft.commercialAdjustment) {
            const el = document.getElementById("commercialAdjustment");
            if (el) el.value = draft.commercialAdjustment;
        }
    } catch (e) {
        console.warn("Draft restore ignored:", e);
    }
}

async function submitBid() {
    const checkbox = document.getElementById("confirmTerms");
    if (!checkbox || !checkbox.checked) {
        alert("Please confirm that the quotation information is accurate before submitting.\nजमा करने से पहले कृपया पुष्टि करें कि कोटेशन की जानकारी सटीक है।");
        return;
    }

    if (calculatePaymentPercentage() !== 100) {
        alert("Payment milestone schedule must total exactly 100%.\nभुगतान मील का पत्थर अनुसूची का कुल योग ठीक 100% होना चाहिए।");
        goToStep(12);
        return;
    }

    const finalAmount = getFinalBid();
    if (finalAmount <= 0) {
        alert("Final bid quotation amount must be greater than zero.\nअंतिम बोली कोटेशन राशि शून्य से अधिक होनी चाहिए।");
        goToStep(10);
        return;
    }

    const durationVal = document.getElementById("duration")?.value;
    if (!durationVal || Number(durationVal) <= 0) {
        alert("Please enter project duration in days.\nकृपया दिनों में परियोजना अवधि दर्ज करें।");
        goToStep(11);
        return;
    }

    const nameDisplay = document.getElementById("top-nav-name") || document.getElementById("contractorNameDisplay");
    const contractorName = nameDisplay ? nameDisplay.textContent : "Contractor";
    const token = getCleanToken();

    const descEn = (document.getElementById("bidDescEn")?.value || "").trim();
    const descHi = (document.getElementById("bidDescHi")?.value || "").trim();

    const payload = {
        quotationId: "quot-" + Date.now(),
        projectId: activeProject ? activeProject.id : "PRJ-UNKNOWN",
        projectTitle: activeProject ? activeProject.title : "Project",
        contractorName: contractorName,
        bidTitle: document.getElementById("bidTitle")?.value || "Contractor Quotation",
        finalAmount: formatCurrency(finalAmount),
        bidAmount: finalAmount,
        materialCost: parseCurrency(document.getElementById("materialTotal")?.textContent),
        labourCost: parseCurrency(document.getElementById("labourTotal")?.textContent),
        equipmentCost: calculateEquipmentTotal(),
        transportCost: calculateTransportTotal(),
        otherCharges: calculateOtherTotal(),
        duration: durationVal + " Days",
        estimatedDuration: durationVal + " Days",
        descriptionEn: descEn,
        descriptionHi: descHi,
        scopeOfWork: descEn || descHi || document.getElementById("bidTitle")?.value,
        status: "UNDER_REVIEW",
        submittedAt: new Date().toISOString()
    };

    // 1. Sync Locally in Contractor Bids Cache
    let contractorBids = [];
    try {
        contractorBids = JSON.parse(localStorage.getItem("buildbid_contractor_bids") || "[]");
    } catch (e) {}
    contractorBids.unshift(payload);
    localStorage.setItem("buildbid_contractor_bids", JSON.stringify(contractorBids));

    // 2. Increment project bid counter in local storage cache
    let customerProjects = [];
    try {
        customerProjects = JSON.parse(localStorage.getItem("buildbid_customer_projects") || localStorage.getItem("customerProjects") || "[]");
        const idx = customerProjects.findIndex(p => String(p.id) === String(payload.projectId) || String(p.projectId) === String(payload.projectId));
        if (idx !== -1) {
            customerProjects[idx].bidsCount = (customerProjects[idx].bidsCount || 0) + 1;
            localStorage.setItem("buildbid_customer_projects", JSON.stringify(customerProjects));
        }
    } catch (e) {}

    // 3. Clear saved draft on successful submit
    if (activeProject && activeProject.id) {
        localStorage.removeItem("buildBidDraft_" + activeProject.id);
    }

    // 4. Backend API Sync (Spring Boot MyBid Subsystem)
    try {
        const resp = await fetch(`${API_BASE_URL}/api/bids`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token ? `Bearer ${token}` : ""
            },
            body: JSON.stringify(payload)
        });
        if (!resp.ok) {
            console.warn(`Backend responded with status ${resp.status}`);
        }
    } catch (e) {
        console.warn("Backend API sync failed:", e);
    }

    alert(`Quotation Submitted Successfully! — कोटेशन सफलतापूर्वक जमा किया गया!\n\nProject / परियोजना: ${payload.projectTitle}\nFinal Bid / अंतिम बोली: ${payload.finalAmount}\nStatus / स्थिति: UNDER REVIEW — समीक्षा में`);
    window.location.href = "contractor-projects.html";
}

function logoutUser() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("marketplaceToken");
  localStorage.removeItem("marketplaceUser");
  localStorage.removeItem("token");
  localStorage.removeItem("authToken");
  localStorage.removeItem("customerUser");
  localStorage.removeItem("buildbid_user");
  localStorage.removeItem("buildbid_current_user");
  sessionStorage.removeItem("currentUser");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("pendingRedirect");
  sessionStorage.removeItem("userData");
  sessionStorage.clear();
  showLogoutToast(() => {
    window.location.href = "index.html";
  });
}

function showLogoutToast(callback, customTitle, customMessage) {
  let toast = document.getElementById("custom-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "custom-toast";
    toast.className = "toast-card";
    toast.innerHTML = `
      <div class="toast-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5"></path>
        </svg>
      </div>
      <div class="toast-body">
        <h4 id="toast-title" class="toast-title">Logout Successful</h4>
        <p id="toast-message" class="toast-message">You have logged out successfully. — सफलतापूर्वक लॉगआउट किया गया।</p>
      </div>
      <button class="toast-close" type="button" aria-label="Close notification">&times;</button>
    `;
    toast.style.cssText = "position:fixed;top:25px;right:25px;z-index:999999;min-width:280px;max-width:380px;display:flex;align-items:center;gap:12px;padding:12px 16px;background:#ffffff;border:1px solid #e2e8f0;border-radius:13px;box-shadow:0 18px 40px rgba(15,23,42,0.13),0 3px 9px rgba(15,23,42,0.05);transition:all 0.3s cubic-bezier(0.4,0,0.2,1);opacity:0;transform:translateY(-20px);pointer-events:none;font-family:'Inter',system-ui,sans-serif;";
    const iconEl = toast.querySelector(".toast-icon");
    if (iconEl) iconEl.style.cssText = "width:38px;height:38px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#ecfdf5;color:#10b981;border-radius:8px;";
    const titleEl = toast.querySelector(".toast-title");
    if (titleEl) titleEl.style.cssText = "margin:0;color:#1e293b;font-size:14px;font-weight:700;";
    const msgEl = toast.querySelector(".toast-message");
    if (msgEl) msgEl.style.cssText = "margin:2px 0 0 0;color:#64748b;font-size:12px;";
    const closeEl = toast.querySelector(".toast-close");
    if (closeEl) closeEl.style.cssText = "background:none;border:none;font-size:18px;color:#94a3b8;cursor:pointer;";
    document.body.appendChild(toast);
  }

  const titleEl = document.getElementById("toast-title");
  if (titleEl) titleEl.innerText = customTitle || "Logout Successful";
  const msgEl = document.getElementById("toast-message");
  if (msgEl) msgEl.innerText = customMessage || "You have logged out successfully. — सफलतापूर्वक लॉगआउट किया गया।";

  void toast.offsetHeight;
  toast.classList.add("show");
  toast.style.opacity = "1";
  toast.style.transform = "translateY(0)";
  toast.style.pointerEvents = "auto";

  let navigated = false;
  const navigateOnce = () => {
    if (navigated) return;
    navigated = true;
    toast.classList.remove("show");
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-20px)";
    toast.style.pointerEvents = "none";
    if (typeof callback === "function") callback();
    else window.location.href = "index.html";
  };

  const closeBtn = toast.querySelector(".toast-close");
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      navigateOnce();
    };
  }

  setTimeout(navigateOnce, 1200);
}
