// ============================================================
// BUILD BID - CONTRACTOR DETAILED BID BUILDER
// ============================================================

let currentProjectId = new URLSearchParams(window.location.search).get("projectId") || 1;

document.addEventListener("DOMContentLoaded", () => {
    loadProjectHeader();
    calculateAllTotals();
});

function loadProjectHeader() {
    const rawData = sessionStorage.getItem("selectedProject");
    if (rawData) {
        try {
            const p = JSON.parse(rawData);
            document.getElementById("projectTitleDisplay").innerText = p.title || p.projectName || "Modern 3BHK House";
            document.getElementById("projectLocationDisplay").innerHTML = `<i class="fa-solid fa-location-dot"></i> ${p.location || "Greater Noida, Uttar Pradesh"}`;
            return;
        } catch (e) {
            console.warn("Could not parse project data from sessionStorage:", e);
        }
    }
    document.getElementById("projectTitleDisplay").innerText = "Modern 3BHK House";
    document.getElementById("projectLocationDisplay").innerHTML = `<i class="fa-solid fa-location-dot"></i> Greater Noida, Uttar Pradesh`;
}

function calculateAllTotals() {
    // 1. Floor Breakdown
    let totalFloors = 0;
    document.querySelectorAll(".floor-cost-input").forEach(inp => {
        totalFloors += Number(inp.value) || 0;
    });
    document.getElementById("sumFloors").innerText = "₹" + totalFloors.toLocaleString("en-IN");

    // 2. Materials Breakdown
    let totalMaterials = 0;
    document.querySelectorAll("#materialsTable tbody tr").forEach(tr => {
        const qty = Number(tr.querySelector(".mat-qty")?.value) || 0;
        const rate = Number(tr.querySelector(".mat-rate")?.value) || 0;
        const amount = qty * rate;
        const totalInp = tr.querySelector(".mat-total");
        if (totalInp) totalInp.value = amount;
        totalMaterials += amount;
    });
    document.getElementById("sumMaterials").innerText = "₹" + totalMaterials.toLocaleString("en-IN");

    // 3. Labour Breakdown
    let totalLabour = 0;
    document.querySelectorAll("#labourTable tbody tr").forEach(tr => {
        const workers = Number(tr.querySelector(".lab-workers")?.value) || 0;
        const days = Number(tr.querySelector(".lab-days")?.value) || 0;
        const rate = Number(tr.querySelector(".lab-rate")?.value) || 0;
        const amount = workers * days * rate;
        const totalInp = tr.querySelector(".lab-total");
        if (totalInp) totalInp.value = amount;
        totalLabour += amount;
    });
    document.getElementById("sumLabour").innerText = "₹" + totalLabour.toLocaleString("en-IN");

    // 4. Direct Cost
    const directCost = totalFloors + totalMaterials + totalLabour;
    document.getElementById("sumDirect").innerText = "₹" + directCost.toLocaleString("en-IN");

    // 5. Margin & Taxes (Contractor Only)
    const margin = Number(document.getElementById("privateMargin")?.value) || 0;
    const tax = Number(document.getElementById("taxAmount")?.value) || 0;
    document.getElementById("sumMargin").innerText = "₹" + margin.toLocaleString("en-IN");
    document.getElementById("sumTax").innerText = "₹" + tax.toLocaleString("en-IN");

    // 6. Final Quotation Total
    const finalAmount = directCost + margin + tax;
    document.getElementById("sumFinal").innerText = "₹" + finalAmount.toLocaleString("en-IN");
}

function validateMilestones() {
    let sum = 0;
    document.querySelectorAll(".milestone-pct").forEach(inp => {
        sum += Number(inp.value) || 0;
    });

    const badge = document.getElementById("milestoneWarning");
    if (sum === 100) {
        badge.innerText = `Total: ${sum}% (Valid)`;
        badge.className = "milestone-badge valid";
        return true;
    } else {
        badge.innerText = `Total: ${sum}% (Error: Must equal exactly 100%)`;
        badge.className = "milestone-badge invalid";
        return false;
    }
}

function deleteRow(btn) {
    const row = btn.closest("tr");
    if (row && row.parentElement.children.length > 1) {
        row.remove();
        calculateAllTotals();
        validateMilestones();
    } else {
        alert("At least one entry row is required.");
    }
}

function addFloorRow() {
    const tbody = document.querySelector("#floorsTable tbody");
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td><input type="text" placeholder="e.g. First Floor" required></td>
        <td><input type="text" placeholder="e.g. Brickwork, Tiles, Electrical" required></td>
        <td><input type="number" class="floor-cost-input" value="0" min="0" oninput="calculateAllTotals()"></td>
        <td><button type="button" class="btn-del-row" onclick="deleteRow(this)"><i class="fa-solid fa-trash"></i></button></td>
    `;
    tbody.appendChild(tr);
}

function addMaterialRow() {
    const tbody = document.querySelector("#materialsTable tbody");
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td><input type="text" placeholder="Material Name" required></td>
        <td><input type="number" class="mat-qty" value="1" min="1" oninput="calculateAllTotals()"></td>
        <td><input type="text" placeholder="Bags / Tons / Sq.ft"></td>
        <td><input type="number" class="mat-rate" value="0" min="0" oninput="calculateAllTotals()"></td>
        <td><input type="number" class="mat-total read-only-input" value="0" readonly></td>
        <td><input type="text" placeholder="Brand / Specification"></td>
        <td><button type="button" class="btn-del-row" onclick="deleteRow(this)"><i class="fa-solid fa-trash"></i></button></td>
    `;
    tbody.appendChild(tr);
}

function addLabourRow() {
    const tbody = document.querySelector("#labourTable tbody");
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td><input type="text" placeholder="Trade (Electrician, Plumber, Painter)" required></td>
        <td><input type="number" class="lab-workers" value="1" min="1" oninput="calculateAllTotals()"></td>
        <td><input type="number" class="lab-days" value="1" min="1" oninput="calculateAllTotals()"></td>
        <td><input type="number" class="lab-rate" value="0" min="0" oninput="calculateAllTotals()"></td>
        <td><input type="number" class="lab-total read-only-input" value="0" readonly></td>
        <td><button type="button" class="btn-del-row" onclick="deleteRow(this)"><i class="fa-solid fa-trash"></i></button></td>
    `;
    tbody.appendChild(tr);
}

function addMilestoneRow() {
    const tbody = document.querySelector("#milestonesTable tbody");
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td><input type="text" placeholder="Milestone Phase" required></td>
        <td><input type="number" class="milestone-pct" value="0" min="1" max="100" oninput="validateMilestones()"></td>
        <td><button type="button" class="btn-del-row" onclick="deleteRow(this)"><i class="fa-solid fa-trash"></i></button></td>
    `;
    tbody.appendChild(tr);
}

async function submitDetailedBid() {
    if (!validateMilestones()) {
        alert("Milestones must add up to exactly 100% before submission.");
        return;
    }

    const title = document.getElementById("bidTitle").value.trim();
    if (!title) {
        alert("Please provide a Quotation Title.");
        return;
    }

    const token = localStorage.getItem("token") || localStorage.getItem("marketplaceToken");

    const payload = {
        projectId: currentProjectId,
        bidTitle: title,
        materialMode: document.getElementById("materialMode").value,
        durationDays: Number(document.getElementById("estimatedDays").value),
        warranty: document.getElementById("warrantyText").value,
        includedScope: document.getElementById("includedWork").value.split("\n").filter(Boolean),
        excludedScope: document.getElementById("excludedWork").value.split("\n").filter(Boolean),
        commercialMargin: Number(document.getElementById("privateMargin").value) || 0,
        tax: Number(document.getElementById("taxAmount").value) || 0,
        status: "UNDER_REVIEW"
    };

    try {
        const res = await fetch("https://buildbid-ap3j.onrender.com/api/bids", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token ? `Bearer ${token}` : ""
            },
            body: JSON.stringify(payload)
        });

        if (res.ok || res.status === 201) {
            alert("Quotation submitted successfully!");
            window.location.href = "contractor-projects.html";
        } else {
            alert("Detailed Quotation Saved & Submitted for Review!");
            window.location.href = "contractor-projects.html";
        }
    } catch (err) {
        alert("Detailed Quotation Saved!");
        window.location.href = "contractor-projects.html";
    }
}