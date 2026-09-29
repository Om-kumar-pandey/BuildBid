/* ==========================================================================
   BuildBid — Add New Construction Material Script (add-material.js)
   BILINGUAL (ENGLISH + HINDI) SELLER INVENTORY CREATION MODULE
   ========================================================================== */

// 1. Core Utilities & Auth
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

// 2. Comprehensive Construction Materials Catalog (English + Hindi)
const MATERIALS_CATALOG = {
    "Cement — सीमेंट": [
        "Ordinary Portland Cement — साधारण पोर्टलैंड सीमेंट",
        "Portland Pozzolana Cement — पोर्टलैंड पोज़ोलाना सीमेंट",
        "Portland Slag Cement — पोर्टलैंड स्लैग सीमेंट",
        "Rapid Hardening Cement — जल्दी मजबूत होने वाला सीमेंट",
        "White Cement — सफेद सीमेंट",
        "Masonry Cement — चिनाई सीमेंट",
        "Other Cement — अन्य सीमेंट"
    ],
    "Steel — स्टील": [
        "TMT Steel Bars — टीएमटी सरिया",
        "Mild Steel Bars — हल्का स्टील सरिया",
        "Structural Steel — संरचनात्मक स्टील",
        "Steel Plate — स्टील प्लेट",
        "Steel Sheet — स्टील शीट",
        "Steel Angle — स्टील एंगल",
        "Steel Channel — स्टील चैनल",
        "Steel Beam — स्टील बीम",
        "Steel Pipe — स्टील पाइप",
        "Binding Wire — बांधने वाला तार",
        "Wire Mesh — तार की जाली",
        "Other Steel — अन्य स्टील"
    ],
    "Sand — रेत": [
        "River Sand — नदी की रेत",
        "M-Sand — एम-सैंड",
        "Plastering Sand — प्लास्टर की रेत",
        "Fine Sand — बारीक रेत",
        "Coarse Sand — मोटी रेत",
        "Manufactured Sand — निर्मित रेत",
        "Other Sand — अन्य रेत"
    ],
    "Aggregates — गिट्टी": [
        "10 mm Aggregate — 10 मिमी गिट्टी",
        "20 mm Aggregate — 20 मिमी गिट्टी",
        "40 mm Aggregate — 40 मिमी गिट्टी",
        "Stone Aggregate — पत्थर की गिट्टी",
        "Gravel — बजरी",
        "Crushed Stone — कुचला हुआ पत्थर",
        "Other Aggregate — अन्य गिट्टी"
    ],
    "Bricks & Blocks — ईंट और ब्लॉक": [
        "Red Brick — लाल ईंट",
        "Fly Ash Brick — फ्लाई ऐश ईंट",
        "Concrete Brick — कंक्रीट ईंट",
        "AAC Block — एएसी ब्लॉक",
        "Hollow Block — खोखला ब्लॉक",
        "Solid Concrete Block — ठोस कंक्रीट ब्लॉक",
        "Clay Block — मिट्टी का ब्लॉक",
        "Interlocking Block — इंटरलॉकिंग ब्लॉक",
        "Paver Block — पेवर ब्लॉक",
        "Other Block — अन्य ब्लॉक"
    ],
    "Concrete — कंक्रीट": [
        "Ready-Mix Concrete (RMC) — रेडी-मिक्स कंक्रीट",
        "Precast Concrete Slab — प्रीकास्ट कंक्रीट स्लैब",
        "Precast Concrete Column — प्रीकास्ट कंक्रीट खंभा",
        "Reinforced Concrete — प्रबलित कंक्रीट",
        "Lightweight Concrete — हल्का कंक्रीट",
        "Other Concrete Material — अन्य कंक्रीट सामग्री"
    ],
    "Tiles & Flooring — टाइल्स और फर्श": [
        "Ceramic Tiles — सिरेमिक टाइल्स",
        "Vitrified Tiles — विट्रिफाइड टाइल्स",
        "Porcelain Tiles — पोर्सिलेन टाइल्स",
        "Floor Tiles — फर्श की टाइल्स",
        "Wall Tiles — दीवार की टाइल्स",
        "Anti-Skid Tiles — फिसलन रोकने वाली टाइल्स",
        "Parking Tiles — पार्किंग टाइल्स",
        "Outdoor Tiles — बाहरी उपयोग की टाइल्स",
        "Marble — संगमरमर",
        "Granite — ग्रेनाइट",
        "Kota Stone — कोटा पत्थर",
        "Natural Stone — प्राकृतिक पत्थर",
        "Other Flooring Material — अन्य फर्श सामग्री"
    ],
    "Adhesives & Construction Chemicals — चिपकाने और निर्माण रसायन": [
        "Tile Adhesive — टाइल चिपकाने वाला पदार्थ",
        "Construction Adhesive — निर्माण चिपकाने वाला पदार्थ",
        "Epoxy — एपॉक्सी",
        "Grout — जोड़ भरने वाला पदार्थ",
        "Sealant — सील करने वाला पदार्थ",
        "Bonding Agent — जोड़ने वाला पदार्थ",
        "Concrete Admixture — कंक्रीट मिश्रण पदार्थ",
        "Curing Compound — कंक्रीट की मजबूती बनाए रखने वाला पदार्थ",
        "Crack Filler — दरार भरने वाला पदार्थ",
        "Repair Chemical — मरम्मत रसायन",
        "Other Construction Chemical — अन्य निर्माण रसायन"
    ],
    "Plumbing — प्लंबिंग सामग्री": [
        "PVC Pipe — पीवीसी पाइप",
        "CPVC Pipe — सीपीवीसी पाइप",
        "UPVC Pipe — यूपीवीसी पाइप",
        "HDPE Pipe — एचडीपीई पाइप",
        "GI Pipe — जीआई पाइप",
        "PPR Pipe — पीपीआर पाइप",
        "Water Tank — पानी की टंकी",
        "Pipe Fittings — पाइप फिटिंग",
        "Elbow — पाइप मोड़",
        "Tee — टी फिटिंग",
        "Coupler — जोड़ने वाली फिटिंग",
        "Union — यूनियन फिटिंग",
        "Valve — वाल्व",
        "Tap — नल",
        "Floor Drain — फर्श की पानी निकासी",
        "Other Plumbing Material — अन्य प्लंबिंग सामग्री"
    ],
    "Electrical — बिजली सामग्री": [
        "Electrical Wire — बिजली का तार",
        "Electrical Cable — बिजली की केबल",
        "Switch — स्विच",
        "Socket — सॉकेट",
        "Distribution Board — बिजली वितरण बोर्ड",
        "MCB — एमसीबी",
        "RCCB — आरसीसीबी",
        "Conduit Pipe — बिजली के तार की पाइप",
        "Junction Box — जंक्शन बॉक्स",
        "LED Light — एलईडी लाइट",
        "Electrical Panel — बिजली पैनल",
        "Earthing Material — अर्थिंग सामग्री",
        "Cable Tray — केबल ट्रे",
        "Other Electrical Material — अन्य बिजली सामग्री"
    ],
    "Paint & Wall Finishing — पेंट और दीवार की फिनिशिंग": [
        "Interior Wall Paint — अंदर की दीवार का पेंट",
        "Exterior Wall Paint — बाहर की दीवार का पेंट",
        "Primer — पेंट की शुरुआती परत",
        "Wall Putty — दीवार की पुट्टी",
        "Enamel Paint — एनामेल पेंट",
        "Metal Paint — धातु का पेंट",
        "Wood Paint — लकड़ी का पेंट",
        "Waterproof Paint — पानी से बचाने वाला पेंट",
        "Texture Paint — डिजाइन वाला पेंट",
        "Wall Texture — दीवार की बनावट",
        "Other Paint Material — अन्य पेंट सामग्री"
    ],
    "Waterproofing — वॉटरप्रूफिंग सामग्री": [
        "Waterproofing Chemical — पानी रोकने वाला रसायन",
        "Waterproofing Membrane — पानी रोकने वाली परत",
        "Waterproofing Coating — पानी रोकने वाली कोटिंग",
        "Waterproofing Powder — पानी रोकने वाला पाउडर",
        "Joint Sealant — जोड़ सील करने वाला पदार्थ",
        "Other Waterproofing Material — अन्य वॉटरप्रूफिंग सामग्री"
    ],
    "Doors & Windows — दरवाजे और खिड़कियां": [
        "Wooden Door — लकड़ी का दरवाजा",
        "Steel Door — स्टील का दरवाजा",
        "Aluminium Door — एल्युमिनियम का दरवाजा",
        "UPVC Door — यूपीवीसी दरवाजा",
        "Glass Door — कांच का दरवाजा",
        "Wooden Window — लकड़ी की खिड़की",
        "Aluminium Window — एल्युमिनियम की खिड़की",
        "UPVC Window — यूपीवीसी खिड़की",
        "Glass Window — कांच की खिड़की",
        "Door Frame — दरवाजे का चौखट",
        "Window Frame — खिड़की का चौखट",
        "Hardware Fittings — हार्डवेयर फिटिंग",
        "Other Door/Window Material — अन्य दरवाजा/खिड़की सामग्री"
    ],
    "Roofing — छत की सामग्री": [
        "Roofing Sheet — छत की शीट",
        "Colour Coated Sheet — रंग लगी छत की शीट",
        "Galvanized Sheet — जस्ती शीट",
        "Polycarbonate Sheet — पॉलीकार्बोनेट शीट",
        "Metal Roofing Sheet — धातु की छत की शीट",
        "Roof Tile — छत की टाइल",
        "Roof Insulation Material — छत को गर्मी से बचाने वाली सामग्री",
        "Other Roofing Material — अन्य छत सामग्री"
    ],
    "Wood & Boards — लकड़ी और बोर्ड": [
        "Plywood — प्लाईवुड",
        "Commercial Plywood — सामान्य प्लाईवुड",
        "Waterproof Plywood — पानी से सुरक्षित प्लाईवुड",
        "MDF Board — एमडीएफ बोर्ड",
        "Particle Board — पार्टिकल बोर्ड",
        "Block Board — ब्लॉक बोर्ड",
        "Laminated Board — लेमिनेटेड बोर्ड",
        "Wooden Plank — लकड़ी का पटरा",
        "Timber — इमारती लकड़ी",
        "Veneer — लकड़ी की पतली परत",
        "Other Wood Material — अन्य लकड़ी सामग्री"
    ],
    "Sanitary — सैनिटरी सामग्री": [
        "Wash Basin — वॉश बेसिन",
        "Toilet — शौचालय",
        "Western Toilet — पश्चिमी शौचालय",
        "Indian Toilet — भारतीय शौचालय",
        "Urinal — मूत्रालय",
        "Shower — शॉवर",
        "Bathroom Tap — बाथरूम का नल",
        "Bathroom Fittings — बाथरूम फिटिंग",
        "Floor Drain — फर्श की पानी निकासी",
        "Other Sanitary Material — अन्य सैनिटरी सामग्री"
    ],
    "Hardware — हार्डवेयर": [
        "Nails — कील",
        "Screws — पेंच",
        "Nuts — नट",
        "Bolts — बोल्ट",
        "Washers — वॉशर",
        "Hinges — कब्जे",
        "Door Handle — दरवाजे का हैंडल",
        "Locks — ताला",
        "Latches — कुंडी",
        "Brackets — ब्रैकेट",
        "Fasteners — जोड़ने वाले सामान",
        "Other Hardware — अन्य हार्डवेयर"
    ],
    "Other — अन्य": [
        "Other Construction Material — अन्य निर्माण सामग्री"
    ]
};

// 3. Page Initialization & DOM Wiring
document.addEventListener("DOMContentLoaded", function() {
    // Check if opened from Invoice Entry
    const urlParams = new URLSearchParams(window.location.search);
    const isFromInvoice = urlParams.get("from") === "invoice";
    if (isFromInvoice) {
        const backLink = document.getElementById("backLink");
        if (backLink) {
            backLink.href = "seller-dashboard.html?from=invoice&openInvoice=true#invoices";
            backLink.innerHTML = '<i class="fa-solid fa-arrow-left text-blue-400"></i><span>Back to Invoices — इनवॉइस पर वापस जाएं</span>';
        }
    }

    // Auth check
    const token = getCleanToken();
    if (!token) {
        console.warn("Add Material: No authentication token found. Redirecting to login...");
        window.location.replace("index.html");
        return;
    }

    const categorySelect = document.getElementById("categorySelect");
    const materialSelect = document.getElementById("materialSelect");
    const customMaterialContainer = document.getElementById("customMaterialContainer");
    const customMaterialName = document.getElementById("customMaterialName");
    const customMaterialDescription = document.getElementById("customMaterialDescription");
    const initialStockInput = document.getElementById("initialStockInput");
    const reservedStockInput = document.getElementById("reservedStockInput");
    const availableStockDisplay = document.getElementById("availableStockDisplay");
    const addStockWarning = document.getElementById("addStockWarning");
    const unitSelect = document.getElementById("unitSelect");
    const unitPriceInput = document.getElementById("unitPriceInput");
    const priceDisplayBadge = document.getElementById("priceDisplayBadge");
    const addMaterialForm = document.getElementById("addMaterialForm");
    const submitBtn = document.getElementById("submitMaterialBtn");

    // Handle Category Selection
    categorySelect.addEventListener("change", function() {
        const selectedCategory = this.value;
        materialSelect.innerHTML = "";

        if (!selectedCategory) {
            materialSelect.disabled = true;
            materialSelect.classList.add("bg-slate-100");
            materialSelect.classList.remove("bg-slate-50", "focus:bg-white");
            materialSelect.innerHTML = '<option value="" disabled selected>-- First select a category above / पहले ऊपर श्रेणी चुनें --</option>';
            hideCustomMaterial();
            return;
        }

        materialSelect.disabled = false;
        materialSelect.classList.remove("bg-slate-100");
        materialSelect.classList.add("bg-slate-50", "focus:bg-white");

        const materials = MATERIALS_CATALOG[selectedCategory] || [];
        materialSelect.innerHTML = '<option value="" disabled selected>-- Select Material / सामग्री चुनें --</option>';

        materials.forEach(mat => {
            const opt = document.createElement("option");
            opt.value = mat;
            opt.textContent = mat;
            materialSelect.appendChild(opt);
        });

        // Always add a clear Other option if not in catalog
        const hasOther = materials.some(m => m.includes("Other") || m.includes("अन्य"));
        if (!hasOther) {
            const otherOpt = document.createElement("option");
            otherOpt.value = "Other — अन्य";
            otherOpt.textContent = "Other — अन्य (Custom Material)";
            materialSelect.appendChild(otherOpt);
        }

        // If category is "Other — अन्य", show custom input immediately
        if (selectedCategory === "Other — अन्य") {
            showCustomMaterial();
        } else {
            hideCustomMaterial();
        }
    });

    // Handle Material Selection
    materialSelect.addEventListener("change", function() {
        const val = this.value || "";
        if (val.startsWith("Other") || val.includes("अन्य") || val.includes("Other")) {
            showCustomMaterial();
        } else {
            hideCustomMaterial();
        }
    });

    function showCustomMaterial() {
        if (customMaterialContainer) {
            customMaterialContainer.classList.remove("hidden");
            if (customMaterialName) {
                customMaterialName.required = true;
                customMaterialName.focus();
            }
        }
    }

    function hideCustomMaterial() {
        if (customMaterialContainer) {
            customMaterialContainer.classList.add("hidden");
            if (customMaterialName) {
                customMaterialName.required = false;
            }
        }
    }

    // Live Available Stock Calculator (Available = Current - Reserved)
    function updateAvailableStock() {
        const current = parseFloat(initialStockInput ? initialStockInput.value : 0) || 0;
        const reserved = parseFloat(reservedStockInput ? reservedStockInput.value : 0) || 0;
        const available = current - reserved;
        const unitVal = unitSelect && unitSelect.value ? unitSelect.value.split("—")[0].trim() : "";

        if (reserved > current) {
            if (addStockWarning) addStockWarning.classList.remove("hidden");
            if (availableStockDisplay) {
                availableStockDisplay.value = "Invalid (Reserved > Current)";
                availableStockDisplay.classList.remove("text-emerald-700");
                availableStockDisplay.classList.add("text-red-600");
            }
        } else {
            if (addStockWarning) addStockWarning.classList.add("hidden");
            if (availableStockDisplay) {
                availableStockDisplay.value = Math.max(0, available).toLocaleString("en-IN") + (unitVal ? " " + unitVal : "");
                availableStockDisplay.classList.remove("text-red-600");
                availableStockDisplay.classList.add("text-emerald-700");
            }
        }
    }

    if (initialStockInput) initialStockInput.addEventListener("input", updateAvailableStock);
    if (reservedStockInput) reservedStockInput.addEventListener("input", updateAvailableStock);

    // Live Price Display Updater
    function updatePriceBadge() {
        const price = parseFloat(unitPriceInput.value) || 0;
        const unitVal = unitSelect.value || "Unit";
        const unitDisplay = unitVal.split("—")[0].trim() || "Unit";
        const formattedPrice = price > 0 ? "₹" + price.toLocaleString("en-IN") : "₹0.00";
        priceDisplayBadge.innerText = `${formattedPrice} / ${unitDisplay}`;
    }

    unitPriceInput.addEventListener("input", updatePriceBadge);
    unitSelect.addEventListener("change", updatePriceBadge);

    // Form Submission
    addMaterialForm.addEventListener("submit", async function(e) {
        e.preventDefault();

        const category = categorySelect.value.trim();
        const selectedMaterial = materialSelect.value.trim();
        const isOther = category === "Other — अन्य" ||
                        selectedMaterial.startsWith("Other") ||
                        selectedMaterial.includes("अन्य") ||
                        !selectedMaterial;

        let finalMaterialName = selectedMaterial;
        let finalDescription = "";

        if (isOther) {
            finalMaterialName = customMaterialName.value.trim();
            finalDescription = customMaterialDescription.value.trim();
            if (!finalMaterialName) {
                showToast("Please enter a custom material name — सामग्री का नाम दर्ज करें", "error");
                customMaterialName.focus();
                return;
            }
        } else {
            if (!finalMaterialName) {
                showToast("Please select a material — सामग्री का चयन करें", "error");
                materialSelect.focus();
                return;
            }
        }

        const initialStock = parseFloat(initialStockInput.value);
        if (isNaN(initialStock) || initialStock <= 0) {
            showToast("Please enter a valid stock quantity (> 0) — वैध स्टॉक मात्रा दर्ज करें", "error");
            initialStockInput.focus();
            return;
        }

        const reservedStock = parseFloat(reservedStockInput ? reservedStockInput.value : 0) || 0;
        if (reservedStock < 0) {
            showToast("Reserved Stock cannot be negative — आरक्षित स्टॉक नकारात्मक नहीं हो सकता", "error");
            reservedStockInput.focus();
            return;
        }
        if (reservedStock > initialStock) {
            showToast("Reserved Stock cannot be greater than Current Stock. आरक्षित स्टॉक वर्तमान स्टॉक से अधिक नहीं हो सकता।", "error");
            reservedStockInput.focus();
            return;
        }

        const unit = unitSelect.value.trim();
        if (!unit) {
            showToast("Please select a unit of measurement — इकाई चुनें", "error");
            unitSelect.focus();
            return;
        }

        const unitPrice = parseFloat(unitPriceInput.value);
        if (isNaN(unitPrice) || unitPrice <= 0) {
            showToast("Please enter a valid selling price (> 0) — वैध विक्रय मूल्य दर्ज करें", "error");
            unitPriceInput.focus();
            return;
        }

        const brand = document.getElementById("brandInput") ? document.getElementById("brandInput").value.trim() : "";
        const specifications = document.getElementById("specificationsInput") ? document.getElementById("specificationsInput").value.trim() : "";

        // Construct Material Payload
        const payload = {
            category: category,
            materialName: finalMaterialName,
            brand: brand,
            specifications: specifications,
            description: finalDescription,
            initialStock: initialStock,
            currentStock: initialStock,
            reservedStock: reservedStock,
            unit: unit,
            unitPrice: unitPrice
        };

        // Submit API Request
        submitBtn.disabled = true;
        const originalBtnHtml = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i><span>Saving Material...</span>';

        try {
            const API_BASE_URL = getApiBaseUrl();
            const response = await fetch(API_BASE_URL + "/api/seller/materials", {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                showToast("Material added successfully — सामग्री सफलतापूर्वक जोड़ दी गई", "success");

                // Return to caller (Invoice Entry or Inventory) after confirmation
                setTimeout(() => {
                    if (isFromInvoice) {
                        sessionStorage.setItem("lastAddedMaterial", finalMaterialName);
                        window.location.href = "seller-dashboard.html?from=invoice&openInvoice=true#invoices";
                    } else {
                        window.location.href = "seller-dashboard.html#inventory";
                    }
                }, 1000);
            } else {
                const errMsg = data.error || data.message || "Failed to add material. Please check details.";
                showToast(errMsg, "error");
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHtml;
            }
        } catch (err) {
            console.error("Add Material error:", err);
            showToast("Network error connecting to BuildBid server. Please try again.", "error");
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
        }
    });
});

// Toast Helper
function showToast(message, type = "success") {
    const toast = document.getElementById("toastNotification");
    const toastMsg = document.getElementById("toastMessage");
    const toastSub = document.getElementById("toastSub");
    const toastIcon = document.getElementById("toastIcon");

    if (!toast || !toastMsg) return;

    toastMsg.innerText = message;
    if (type === "success") {
        toastIcon.className = "fa-solid fa-circle-check text-emerald-400 text-base";
        if (toastSub) toastSub.innerText = "Redirecting to Inventory Catalog...";
    } else {
        toastIcon.className = "fa-solid fa-circle-exclamation text-rose-400 text-base";
        if (toastSub) toastSub.innerText = "Please review form fields and try again.";
    }

    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}
