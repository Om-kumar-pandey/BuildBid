/* =========================================================
   BUILDBID CONTRACTOR BID BUILDER - COMPLETELY DYNAMIC ENGINE
   ========================================================= */

let currentStep = 1;
const totalSteps = 17;
let activeProject = null;

// 1. DYNAMIC INITIALIZATION & DATA POPULATION
document.addEventListener("DOMContentLoaded", function() {
    initDynamicContractor();
    initDynamicProjectData();

    const today = new Date();
    document.getElementById("startDate").value = today.toISOString().split("T")[0];
    calculateCompletion();

    populateDefaultDynamicTables();

    calculateTotals();
    calculateMaterialTotal();
    calculateLabourTotal();
    calculateFinalBid();
    calculatePayments();
    updateProgress();
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

    document.getElementById("contractorNameDisplay").textContent = name;
    document.getElementById("contractorAvatar").textContent = initials;
}

function initDynamicProjectData() {
    const urlParams = new URLSearchParams(window.location.search);
    const projectIdFromUrl = urlParams.get("projectId");

    // Retrieve selected project from sessionStorage or search from live projects list
    const rawStored = sessionStorage.getItem("selectedProject");
    if (rawStored) {
        try {
            activeProject = JSON.parse(rawStored);
        } catch (e) {}
    }

    if (!activeProject && projectIdFromUrl) {
        const rawAll = localStorage.getItem("buildbid_customer_projects") || localStorage.getItem("customerProjects");
        if (rawAll) {
            try {
                const list = JSON.parse(rawAll);
                activeProject = list.find(p => String(p.id) === String(projectIdFromUrl));
            } catch (e) {}
        }
    }

    // Default Fallback Object if accessed directly
    if (!activeProject) {
        activeProject = {
            id: projectIdFromUrl || "PRJ-" + Date.now().toString().slice(-6),
            title: "Residential House Construction",
            projectType: "New Construction",
            area: "1800 sq.ft.",
            floors: "Ground + 1 Floor",
            location: "Sector 150, Noida, Uttar Pradesh",
            budget: "₹35,00,000 - ₹40,00,000",
            bedrooms: "3",
            bathrooms: "3",
            kitchen: "1 Modular",
            parking: "1 Car Parking",
            requirements: "Complete residential construction with RCC structural framing, brick masonry, plumbing, electrical, vitrified tiling and weatherproof paint."
        };
    }

    // Populate Sidebar & Step 1 Inputs dynamically
    document.getElementById("sidebarProjectTitle").textContent = activeProject.title || "Project";
    document.getElementById("sidebarProjectId").textContent = activeProject.id;

    document.getElementById("dynProjectId").value = activeProject.id;
    document.getElementById("dynProjectType").value = activeProject.projectType || activeProject.type || "New Construction";
    document.getElementById("dynArea").value = activeProject.area || activeProject.plotArea || "1800 sq.ft.";
    document.getElementById("dynFloors").value = activeProject.floors || activeProject.floorCount || "Ground + 1";
    document.getElementById("dynLocation").value = activeProject.location || "Location Not Specified";
    document.getElementById("dynBudget").value = activeProject.budget || "Negotiable";

    document.getElementById("dynBedrooms").value = activeProject.bedrooms || activeProject.bhk || "3";
    document.getElementById("dynBathrooms").value = activeProject.bathrooms || "3";
    document.getElementById("dynKitchen").value = activeProject.kitchen || "1";
    document.getElementById("dynParking").value = activeProject.parking || "1 Car";
    document.getElementById("dynRequirementsDesc").value = activeProject.requirements || activeProject.description || "Turnkey residential construction as per customer specifications.";

    document.getElementById("bidTitle").value = `Quotation for ${activeProject.title}`;
}

// 2. DEFAULT DYNAMIC TABLES SEEDING
function populateDefaultDynamicTables() {
    // Floors
    const floorContainer = document.getElementById("floorsContainer");
    floorContainer.innerHTML = "";
    addFloor("Ground Floor", 1200, 180000, 250000, 120000, 60000, 70000, 50000, 40000, 50000, 30000);
    addFloor("First Floor", 1200, 0, 220000, 110000, 60000, 70000, 50000, 40000, 50000, 30000);

    // Materials
    const matTable = document.querySelector("#materialsTable tbody");
    matTable.innerHTML = "";
    addMaterialRowData("Cement (OPC/PPC 53 Grade)", "Cement", 500, "Bags", 420, "UltraTech / ACC", "IS 12269", "Contractor");
    addMaterialRowData("TMT Reinforcement Steel (Fe 550D)", "TMT Steel", 4, "Tons", 62000, "Tata Tiscon / Jindal", "IS 1786", "Contractor");
    addMaterialRowData("Red Clay Bricks / AAC Blocks", "Bricks", 18000, "Pcs", 9, "Standard Grade", "Class 1", "Contractor");

    // Labour
    const labTable = document.querySelector("#labourTable tbody");
    labTable.innerHTML = "";
    addLabourRowData("Mason", 4, 45, 900, "Brickwork & RCC");
    addLabourRowData("Helper / Unskilled Labour", 6, 45, 550, "Material handling & curing");
    addLabourRowData("Bar Bender & Shuttering", 4, 25, 850, "Slab & column framework");

    // Construction Work
    const workTable = document.querySelector("#workTable tbody");
    workTable.innerHTML = "";
    addWorkRowData("Excavation", "Site clearing and earth excavation for foundation", 1200, "sq.ft.", 25, "Up to 5ft depth");
    addWorkRowData("RCC", "Slab casting and column shuttering work", 2400, "sq.ft.", 120, "M20 Grade Mix");

    // Equipment
    const eqTable = document.querySelector("#equipmentTable tbody");
    eqTable.innerHTML = "";
    addEquipmentRowData("Concrete Mixer & Vibrator", 1, 15, 2500, "On-site slab casting");

    // Transport
    const trTable = document.querySelector("#transportTable tbody");
    trTable.innerHTML = "";
    addTransportRowData("Material Transportation", "Bulk delivery of aggregate, sand and cement", 12, "Trips", 2200, "Tipper Truck");

    // Other
    const otherTable = document.querySelector("#otherTable tbody");
    otherTable.innerHTML = "";
    addOtherRowData("Site Setup & Storage", "Temporary shed, power arrangement and security", 18000, "Initial site preparation");

    // Payments
    const payTable = document.querySelector("#paymentTable tbody");
    payTable.innerHTML = "";
    addPaymentRowData("Advance on Agreement", 15, "Mobilization advance");
    addPaymentRowData("Plinth Level Completion", 25, "After foundation & plinth beam");
    addPaymentRowData("Roof Slab Casting", 30, "After structural frame completion");
    addPaymentRowData("Brickwork & Plaster", 20, "After internal/external plaster");
    addPaymentRowData("Final Finishing & Handover", 10, "Keys handover & clearance");

    // Warranty
    const warTable = document.querySelector("#warrantyTable tbody");
    warTable.innerHTML = "";
    addWarrantyRowData("Civil Work", 120, "Months", "10 Years Structural warranty on RCC frame");
    addWarrantyRowData("Waterproofing", 60, "Months", "5 Years Terrace & toilet leakage guarantee");

    // Included Work
    const incList = document.getElementById("includedList");
    incList.innerHTML = "";
    addIncludedRowData("Complete excavation and PCC foundation");
    addIncludedRowData("RCC columns, beams and slab work");
    addIncludedRowData("Internal and external double-coat plastering");
    addIncludedRowData("Concealed electrical wiring with modular boxes");
    addIncludedRowData("Concealed CPVC/UPVC plumbing lines");

    // Excluded Work
    const excList = document.getElementById("excludedList");
    excList.innerHTML = "";
    addExcludedRowData("Government electricity meter & water connection charges");
    addExcludedRowData("Loose furniture, curtains, modular wardrobes");
    addExcludedRowData("Exterior landscaping & boundary wall decoration");
}

// 3. NAVIGATION CONTROLS
function goToStep(step) {
    if (step < 1 || step > totalSteps) return;

    document.querySelectorAll(".bid-section").forEach(s => s.classList.remove("active"));
    document.getElementById("step" + step).classList.add("active");

    document.querySelectorAll(".step").forEach((item, index) => {
        item.classList.remove("active");
        if (index + 1 < step) item.classList.add("completed");
        if (index + 1 === step) item.classList.add("active");
    });

    currentStep = step;
    updateProgress();
    updateNavigation();

    if (step === 17) updateReview();

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function nextStep() {
    if (currentStep === 12) {
        const total = calculatePaymentPercentage();
        if (total !== 100) {
            alert(`Payment schedule must total exactly 100%. Current total: ${total}%`);
            return;
        }
    }
    if (currentStep < totalSteps) goToStep(currentStep + 1);
}

function previousStep() {
    if (currentStep > 1) goToStep(currentStep - 1);
}

function updateProgress() {
    const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
    document.getElementById("progressBar").style.width = percentage + "%";
}

function updateNavigation() {
    const nextButton = document.getElementById("nextButton");
    const submitButton = document.getElementById("submitButton");
    if (currentStep === totalSteps) {
        nextButton.style.display = "none";
        submitButton.style.display = "block";
    } else {
        nextButton.style.display = "block";
        submitButton.style.display = "none";
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
    const row = button.closest("tr") || button.closest(".floor-card") || button.closest(".form-group");
    if (row) row.remove();
    calculateTotals();
    calculatePayments();
}

// 4. FLOORS
function addFloor(name, area, fnd, rcc, msn, pls, flr, elc, plm, pnt, wtp) {
    const container = document.getElementById("floorsContainer");
    const count = container.querySelectorAll(".floor-card").length + 1;
    const div = document.createElement("div");
    div.className = "floor-card";
    div.innerHTML = `
        <div class="floor-header">
            <h4>${name || "Floor " + count}</h4>
            <button class="btn btn-danger" onclick="removeElement(this)">Remove</button>
        </div>
        <div class="grid-4">
            <div class="form-group"><label>Area (sq.ft.)</label><input type="number" class="floor-area" value="${area || 0}" oninput="calculateTotals()"></div>
            <div class="form-group"><label>Foundation</label><input type="number" class="floor-cost" value="${fnd || 0}" oninput="calculateTotals()"></div>
            <div class="form-group"><label>RCC</label><input type="number" class="floor-cost" value="${rcc || 0}" oninput="calculateTotals()"></div>
            <div class="form-group"><label>Masonry</label><input type="number" class="floor-cost" value="${msn || 0}" oninput="calculateTotals()"></div>
            <div class="form-group"><label>Plaster</label><input type="number" class="floor-cost" value="${pls || 0}" oninput="calculateTotals()"></div>
            <div class="form-group"><label>Flooring</label><input type="number" class="floor-cost" value="${flr || 0}" oninput="calculateTotals()"></div>
            <div class="form-group"><label>Electrical</label><input type="number" class="floor-cost" value="${elc || 0}" oninput="calculateTotals()"></div>
            <div class="form-group"><label>Plumbing</label><input type="number" class="floor-cost" value="${plm || 0}" oninput="calculateTotals()"></div>
            <div class="form-group"><label>Painting</label><input type="number" class="floor-cost" value="${pnt || 0}" oninput="calculateTotals()"></div>
            <div class="form-group"><label>Waterproofing</label><input type="number" class="floor-cost" value="${wtp || 0}" oninput="calculateTotals()"></div>
        </div>
    `;
    container.appendChild(div);
    calculateTotals();
}

function calculateTotals() {
    let total = 0;
    document.querySelectorAll(".floor-card .floor-cost").forEach(input => total += Number(input.value) || 0);
    document.getElementById("floorTotal").textContent = formatCurrency(total);
    calculateFinalBid();
}

// 5. MATERIALS
function addMaterialRowData(name, cat, qty, unit, rate, brand, spec, prov) {
    const tbody = document.querySelector("#materialsTable tbody");
    const row = document.createElement("tr");
    const amount = (qty || 0) * (rate || 0);
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
        <td><input type="number" class="material-qty" value="${qty || 0}" oninput="calculateMaterial(this)"></td>
        <td><input value="${unit || 'Units'}" placeholder="Unit"></td>
        <td><input type="number" class="material-rate" value="${rate || 0}" oninput="calculateMaterial(this)"></td>
        <td><input class="material-amount" value="${formatCurrency(amount)}" readonly></td>
        <td><input value="${brand || ''}" placeholder="Brand"></td>
        <td><input value="${spec || ''}" placeholder="Specification"></td>
        <td>
            <select>
                <option ${prov === 'Contractor' ? 'selected' : ''}>Contractor</option>
                <option ${prov === 'Customer' ? 'selected' : ''}>Customer</option>
            </select>
        </td>
        <td><button class="btn btn-danger" onclick="removeElement(this)">×</button></td>
    `;
    tbody.appendChild(row);
}

function addMaterial() { addMaterialRowData(); }

function calculateMaterial(input) {
    const row = input.closest("tr");
    const qty = Number(row.querySelector(".material-qty").value) || 0;
    const rate = Number(row.querySelector(".material-rate").value) || 0;
    row.querySelector(".material-amount").value = formatCurrency(qty * rate);
    calculateMaterialTotal();
}

function calculateMaterialTotal() {
    let total = 0;
    document.querySelectorAll(".material-amount").forEach(inp => total += parseCurrency(inp.value));
    document.getElementById("materialTotal").textContent = formatCurrency(total);
    calculateFinalBid();
}

// 6. LABOUR
function addLabourRowData(trade, workers, days, rate, notes) {
    const tbody = document.querySelector("#labourTable tbody");
    const row = document.createElement("tr");
    const amount = (workers || 0) * (days || 0) * (rate || 0);
    row.innerHTML = `
        <td><input value="${trade || ''}" placeholder="Trade"></td>
        <td><input type="number" class="labour-workers" value="${workers || 0}" oninput="calculateLabour(this)"></td>
        <td><input type="number" class="labour-days" value="${days || 0}" oninput="calculateLabour(this)"></td>
        <td><input type="number" class="labour-rate" value="${rate || 0}" oninput="calculateLabour(this)"></td>
        <td><input class="labour-amount" value="${formatCurrency(amount)}" readonly></td>
        <td><input value="${notes || ''}" placeholder="Notes"></td>
        <td><button class="btn btn-danger" onclick="removeElement(this)">×</button></td>
    `;
    tbody.appendChild(row);
}

function addLabour() { addLabourRowData(); }

function calculateLabour(input) {
    const row = input.closest("tr");
    const w = Number(row.querySelector(".labour-workers").value) || 0;
    const d = Number(row.querySelector(".labour-days").value) || 0;
    const r = Number(row.querySelector(".labour-rate").value) || 0;
    row.querySelector(".labour-amount").value = formatCurrency(w * d * r);
    calculateLabourTotal();
}

function calculateLabourTotal() {
    let total = 0;
    document.querySelectorAll(".labour-amount").forEach(inp => total += parseCurrency(inp.value));
    document.getElementById("labourTotal").textContent = formatCurrency(total);
    calculateFinalBid();
}

// 7. WORK, EQUIPMENT, TRANSPORT, OTHER
function addWorkRowData(cat, desc, qty, unit, rate, notes) {
    const tbody = document.querySelector("#workTable tbody");
    const row = document.createElement("tr");
    const amount = (qty || 0) * (rate || 0);
    row.innerHTML = `
        <td><input value="${cat || ''}" placeholder="Category"></td>
        <td><input value="${desc || ''}" placeholder="Work Description"></td>
        <td><input type="number" class="work-qty" value="${qty || 0}" oninput="calculateWork(this)"></td>
        <td><input value="${unit || 'sq.ft.'}"></td>
        <td><input type="number" class="work-rate" value="${rate || 0}" oninput="calculateWork(this)"></td>
        <td><input class="work-amount" value="${formatCurrency(amount)}" readonly></td>
        <td><input value="${notes || ''}" placeholder="Notes"></td>
        <td><button class="btn btn-danger" onclick="removeElement(this)">×</button></td>
    `;
    tbody.appendChild(row);
}

function addWork() { addWorkRowData(); }

function calculateWork(input) {
    const row = input.closest("tr");
    const q = Number(row.querySelector(".work-qty").value) || 0;
    const r = Number(row.querySelector(".work-rate").value) || 0;
    row.querySelector(".work-amount").value = formatCurrency(q * r);
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
    const amount = (qty || 0) * (days || 0) * (rate || 0);
    row.innerHTML = `
        <td><input value="${name || ''}" placeholder="Equipment Name"></td>
        <td><input type="number" class="equipment-qty" value="${qty || 0}" oninput="calculateEquipment(this)"></td>
        <td><input type="number" class="equipment-days" value="${days || 0}" oninput="calculateEquipment(this)"></td>
        <td><input type="number" class="equipment-rate" value="${rate || 0}" oninput="calculateEquipment(this)"></td>
        <td><input class="equipment-amount" value="${formatCurrency(amount)}" readonly></td>
        <td><input value="${notes || ''}" placeholder="Notes"></td>
        <td><button class="btn btn-danger" onclick="removeElement(this)">×</button></td>
    `;
    tbody.appendChild(row);
}

function addEquipment() { addEquipmentRowData(); }

function calculateEquipment(input) {
    const row = input.closest("tr");
    const q = Number(row.querySelector(".equipment-qty").value) || 0;
    const d = Number(row.querySelector(".equipment-days").value) || 0;
    const r = Number(row.querySelector(".equipment-rate").value) || 0;
    row.querySelector(".equipment-amount").value = formatCurrency(q * d * r);
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
    const amount = (qty || 0) * (rate || 0);
    row.innerHTML = `
        <td><input value="${type || ''}" placeholder="Type"></td>
        <td><input value="${desc || ''}" placeholder="Description"></td>
        <td><input type="number" class="transport-qty" value="${qty || 0}" oninput="calculateTransport(this)"></td>
        <td><input value="${unit || 'Trips'}"></td>
        <td><input type="number" class="transport-rate" value="${rate || 0}" oninput="calculateTransport(this)"></td>
        <td><input class="transport-amount" value="${formatCurrency(amount)}" readonly></td>
        <td><input value="${notes || ''}" placeholder="Notes"></td>
        <td><button class="btn btn-danger" onclick="removeElement(this)">×</button></td>
    `;
    tbody.appendChild(row);
}

function addTransport() { addTransportRowData(); }

function calculateTransport(input) {
    const row = input.closest("tr");
    const q = Number(row.querySelector(".transport-qty").value) || 0;
    const r = Number(row.querySelector(".transport-rate").value) || 0;
    row.querySelector(".transport-amount").value = formatCurrency(q * r);
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
        <td><input type="number" class="other-amount-input" value="${amt || 0}" oninput="calculateOther()"></td>
        <td><input value="${notes || ''}" placeholder="Notes"></td>
        <td><button class="btn btn-danger" onclick="removeElement(this)">×</button></td>
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

// 8. FINAL BID CALCULATION
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
    const commercial = Number(document.getElementById("commercialAdjustment").value) || 0;
    const taxRate = Number(document.getElementById("taxRate").value) || 0;

    const taxable = direct + commercial;
    const tax = taxable * taxRate / 100;
    const final = taxable + tax;

    document.getElementById("priceFloor").textContent = formatCurrency(floors);
    document.getElementById("priceMaterial").textContent = formatCurrency(materials);
    document.getElementById("priceLabour").textContent = formatCurrency(labour);
    document.getElementById("priceWork").textContent = formatCurrency(work);
    document.getElementById("priceEquipment").textContent = formatCurrency(equipment);
    document.getElementById("priceTransport").textContent = formatCurrency(transport);
    document.getElementById("priceOther").textContent = formatCurrency(other);

    document.getElementById("directCost").textContent = formatCurrency(direct);
    document.getElementById("commercialDirect").textContent = formatCurrency(direct);
    document.getElementById("commercialValue").textContent = formatCurrency(commercial);
    document.getElementById("taxValue").textContent = formatCurrency(tax);
    document.getElementById("finalBid").textContent = formatCurrency(final);
}

function getFinalBid() {
    return parseCurrency(document.getElementById("finalBid").textContent);
}

// 9. TIMELINE & PAYMENTS
function calculateCompletion() {
    const start = document.getElementById("startDate").value;
    const duration = Number(document.getElementById("duration").value);
    if (!start || !duration) return;
    const date = new Date(start);
    date.setDate(date.getDate() + duration);
    document.getElementById("completionDate").value = date.toISOString().split("T")[0];
}

function addPaymentRowData(name, pct, desc) {
    const tbody = document.querySelector("#paymentTable tbody");
    const row = document.createElement("tr");
    row.innerHTML = `
        <td><input value="${name || ''}" placeholder="Milestone Name"></td>
        <td><input type="number" value="${pct || 0}" class="payment-percent" oninput="calculatePayments()"></td>
        <td><input class="payment-amount" readonly></td>
        <td><input value="${desc || ''}" placeholder="Description"></td>
        <td><button class="btn btn-danger" onclick="removeElement(this);calculatePayments()">×</button></td>
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
        const pct = Number(row.querySelector(".payment-percent").value) || 0;
        row.querySelector(".payment-amount").value = formatCurrency(final * pct / 100);
        total += pct;
    });

    const box = document.getElementById("paymentTotalBox");
    box.textContent = `Total Payment: ${total}%`;
    box.className = total === 100 ? "payment-total valid" : "payment-total invalid";
}

// 10. WARRANTY, INCLUSIONS & EXCLUSIONS
function addWarrantyRowData(cat, dur, unit, desc) {
    const tbody = document.querySelector("#warrantyTable tbody");
    const row = document.createElement("tr");
    row.innerHTML = `
        <td><input value="${cat || 'Civil Work'}"></td>
        <td><input type="number" value="${dur || 12}"></td>
        <td><input value="${unit || 'Months'}"></td>
        <td><input value="${desc || ''}" placeholder="Warranty Details"></td>
        <td><button class="btn btn-danger" onclick="removeElement(this)">×</button></td>
    `;
    tbody.appendChild(row);
}

function addWarranty() { addWarrantyRowData(); }

function addIncludedRowData(text) {
    const list = document.getElementById("includedList");
    const div = document.createElement("div");
    div.className = "form-group";
    div.innerHTML = `<input value="${text || ''}" placeholder="Included Work">`;
    list.appendChild(div);
}

function addIncluded() { addIncludedRowData(); }

function addExcludedRowData(text) {
    const list = document.getElementById("excludedList");
    const div = document.createElement("div");
    div.className = "form-group";
    div.innerHTML = `<input value="${text || ''}" placeholder="Excluded Work">`;
    list.appendChild(div);
}

function addExcluded() { addExcludedRowData(); }

// 11. REVIEW & SUBMISSION
function updateReview() {
    calculateFinalBid();
    document.getElementById("reviewProjectName").textContent = activeProject ? (activeProject.title || activeProject.id) : "Customer Project";
    document.getElementById("reviewContractorName").textContent = document.getElementById("contractorNameDisplay").textContent;
    document.getElementById("reviewBidTitle").textContent = document.getElementById("bidTitle").value || "Contractor Proposal";
    document.getElementById("reviewDuration").textContent = (document.getElementById("duration").value || 0) + " Days";

    document.getElementById("reviewFloor").textContent = formatCurrency(getFloorTotal());
    document.getElementById("reviewMaterial").textContent = document.getElementById("materialTotal").textContent;
    document.getElementById("reviewLabour").textContent = document.getElementById("labourTotal").textContent;
    document.getElementById("reviewWork").textContent = formatCurrency(calculateWorkTotal());
    document.getElementById("reviewEquipment").textContent = formatCurrency(calculateEquipmentTotal());
    document.getElementById("reviewTransport").textContent = formatCurrency(calculateTransportTotal());
    document.getElementById("reviewOther").textContent = formatCurrency(calculateOtherTotal());
    document.getElementById("reviewFinal").textContent = formatCurrency(getFinalBid());
}

function saveDraft() {
    const bidData = {
        status: "DRAFT",
        projectId: activeProject ? activeProject.id : "PRJ-UNKNOWN",
        bidTitle: document.getElementById("bidTitle").value,
        finalAmount: getFinalBid(),
        savedAt: new Date().toISOString()
    };
    localStorage.setItem("buildBidDraft_" + bidData.projectId, JSON.stringify(bidData));
    alert("Draft saved successfully for this project.");
}

async function submitBid() {
    const checkbox = document.getElementById("confirmTerms");
    if (!checkbox.checked) {
        alert("Please confirm that the quotation information is accurate.");
        return;
    }

    if (calculatePaymentPercentage() !== 100) {
        alert("Payment schedule must equal exactly 100%.");
        goToStep(12);
        return;
    }

    const finalAmount = getFinalBid();
    if (finalAmount <= 0) {
        alert("Final bid amount must be greater than zero.");
        goToStep(10);
        return;
    }

    const contractorName = document.getElementById("contractorNameDisplay").textContent;
    const token = localStorage.getItem("token") || localStorage.getItem("marketplaceToken");

    const payload = {
        quotationId: "quot-" + Date.now(),
        projectId: activeProject ? activeProject.id : "PRJ-UNKNOWN",
        projectTitle: activeProject ? activeProject.title : "Project",
        contractorName: contractorName,
        bidTitle: document.getElementById("bidTitle").value,
        finalAmount: formatCurrency(finalAmount),
        duration: document.getElementById("duration").value + " Days",
        status: "UNDER_REVIEW",
        submittedAt: new Date().toLocaleDateString("en-IN")
    };

    // 1. Sync Locally
    let contractorBids = [];
    try {
        contractorBids = JSON.parse(localStorage.getItem("buildbid_contractor_bids") || "[]");
    } catch (e) {}
    contractorBids.unshift(payload);
    localStorage.setItem("buildbid_contractor_bids", JSON.stringify(contractorBids));

    // 2. Increment project bid counter
    let customerProjects = [];
    try {
        customerProjects = JSON.parse(localStorage.getItem("buildbid_customer_projects") || localStorage.getItem("customerProjects") || "[]");
        const idx = customerProjects.findIndex(p => String(p.id) === String(payload.projectId));
        if (idx !== -1) {
            customerProjects[idx].bidsCount = (customerProjects[idx].bidsCount || 0) + 1;
            localStorage.setItem("buildbid_customer_projects", JSON.stringify(customerProjects));
        }
    } catch (e) {}

    // 3. Backend API Sync (Spring Boot)
    try {
        await fetch("https://buildbid-ap3j.onrender.com/api/bids", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token ? `Bearer ${token}` : ""
            },
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.warn("Backend API sync failed:", e);
    }

    alert(`Quotation Submitted Successfully!\nProject: ${payload.projectTitle}\nFinal Bid: ${payload.finalAmount}\nStatus: UNDER REVIEW`);
    window.location.href = "contractor-projects.html";
}
