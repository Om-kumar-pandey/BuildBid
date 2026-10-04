
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================================
   DIRECT BUY & MULTI-SELLER ALLOCATION HELPERS (FLOW A & B)
   ========================================================= */
function getDirectBuyTimelineHTML(req) {
  const rawStatus = (req.rawStatus || req.status || "").toUpperCase();
  let currentStep = 1;

  if (rawStatus.includes("DELIVERED") || rawStatus.includes("डिलीवर") || rawStatus === "COMPLETED") {
    currentStep = 6;
  } else if (rawStatus.includes("OUT_FOR_DELIVERY") || rawStatus.includes("OUT FOR DELIVERY") || rawStatus.includes("रवाना")) {
    currentStep = 5;
  } else if (rawStatus.includes("READY_FOR_DISPATCH") || rawStatus.includes("READY FOR DISPATCH") || rawStatus.includes("DISPATCH") || rawStatus.includes("तैयार")) {
    currentStep = 4;
  } else if (rawStatus.includes("PROCESSING") || rawStatus.includes("प्रक्रिया")) {
    currentStep = 3;
  } else if (rawStatus.includes("ORDER_ACCEPTED") || rawStatus.includes("ACCEPTED") || rawStatus.includes("स्वीकार")) {
    currentStep = 2;
  } else {
    currentStep = 1; // WAITING_FOR_ACCEPTANCE
  }

  const DIRECT_BUY_PHASES = [
    { step: 1, key: "WAITING_FOR_ACCEPTANCE", en: "Waiting for Acceptance", hi: "स्वीकृति की प्रतीक्षा", desc: "Your direct material purchase request has been sent to the seller and is waiting for acceptance." },
    { step: 2, key: "ORDER_ACCEPTED", en: "Order Accepted", hi: "ऑर्डर स्वीकार किया गया", desc: "The seller has accepted your direct purchase order." },
    { step: 3, key: "PROCESSING", en: "Processing", hi: "प्रक्रिया में", desc: "Seller is currently processing and preparing your direct purchase order." },
    { step: 4, key: "READY_FOR_DISPATCH", en: "Ready for Dispatch", hi: "भेजने के लिए तैयार", desc: "Seller has prepared, checked, and packaged materials for dispatch." },
    { step: 5, key: "OUT_FOR_DELIVERY", en: "Out for Delivery", hi: "डिलीवरी के लिए रवाना", desc: "Order has been dispatched and is currently on the vehicle out for delivery to your site." },
    { step: 6, key: "DELIVERED", en: "Delivered", hi: "डिलीवर किया गया", desc: "Your material order has been safely delivered to your site." }
  ];

  const currentPhase = DIRECT_BUY_PHASES[currentStep - 1];
  let badgeClass = "pending";
  if (currentStep === 1) {
    badgeClass = "pending";
  } else if (currentStep === 2) {
    badgeClass = "accepted";
  } else if (currentStep === 6) {
    badgeClass = "completed";
  } else {
    badgeClass = "active";
  }

  const sellerName = req.sellerName || req.targetProvider || "Designated Seller";
  const sellerPhone = req.sellerPhone;

  // Build the 6-Stage Timeline Tracker
  const stepsHTML = DIRECT_BUY_PHASES.map((p) => {
    let stepClass = "direct-timeline-step";
    let dotClass = "step-dot";
    let dotContent = "";

    if (currentStep === 6) {
      // DELIVERED: All 6 phases are completed with checkmark. NO spinner on delivered.
      stepClass += " passed";
      dotClass += " completed";
      dotContent = '<i class="fa-solid fa-check"></i>';
    } else {
      if (p.step < currentStep) {
        stepClass += " passed";
        dotClass += " completed";
        dotContent = '<i class="fa-solid fa-check"></i>';
      } else if (p.step === currentStep) {
        stepClass += " current";
        dotClass += " current";
        dotContent = '<span class="phase-spinner" title="In Progress"></span>';
      } else {
        stepClass += " pending";
        dotClass += " pending";
        dotContent = '<span class="dot-inactive"></span>';
      }
    }

    return `
      <div class="${stepClass}">
        <div class="${dotClass}">
          ${dotContent}
        </div>
        <span class="step-label-en">${p.en}</span>
        <span class="step-label-hi">${p.hi}</span>
      </div>
    `;
  }).join("");

  return `
    <div class="card-direct-buy-section">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
        <div>
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #0284c7; letter-spacing: 0.5px;">
            <i class="fa-solid fa-truck-fast mr-1"></i> Direct Purchase Flow / सीधा खरीद प्रवाह
          </span>
          <h4 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 3px 0 0;">
            ${escapeHtml(sellerName)}
          </h4>
        </div>
        <span class="status-badge ${badgeClass}">
          <i class="fa-solid fa-circle-dot"></i> ${currentPhase.en} / ${currentPhase.hi}
        </span>
      </div>

      <!-- 6-Stage Dynamic Timeline Tracker -->
      <div class="direct-buy-timeline-tracker">
        ${stepsHTML}
      </div>

      <div style="margin-top: 12px; font-size: 13px; color: #475569; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <div>
          <i class="fa-solid fa-circle-info" style="color: #0284c7; margin-right: 4px;"></i>
          <span>${currentPhase.desc}</span>
        </div>
        ${req.expectedDeliveryDate ? `
          <div style="font-weight: 600; color: #0f172a; font-size: 12px;">
            <i class="fa-regular fa-calendar-check" style="color: #64748b; margin-right: 4px;"></i> Expected Delivery: ${escapeHtml(req.expectedDeliveryDate)}
          </div>
        ` : ''}
      </div>

      ${currentStep >= 2 && sellerPhone ? `
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1; font-size: 13px; color: #334155; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
          <span><strong><i class="fa-solid fa-store" style="color: #475569; margin-right: 4px;"></i> Authorized Seller Contact:</strong> ${escapeHtml(sellerName)} (${escapeHtml(sellerPhone)})</span>
          <button class="btn-card-action" style="padding: 4px 10px; font-size: 12px;" onclick="openContactProviderModal('${escapeHtml(sellerName)}', 'Material Seller', '${escapeHtml(sellerPhone)}', '')">
            <i class="fa-solid fa-phone" style="margin-right: 4px;"></i> Contact Seller
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

function getConfirmedAllocationCardHTML(req) {
  const orders = req.orders || [];
  const orderCount = orders.length > 0 ? orders.length : (req.allocatedOrdersCount || 2);
  return `
    <div class="card-direct-buy-section" style="border-left: 4px solid #10b981; background: #f0fdf4;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
        <div>
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #059669; letter-spacing: 0.5px;">
            <i class="fa-solid fa-circle-check mr-1"></i> Multi-Seller Allocation Confirmed / खरीद आवंटन की पुष्टि
          </span>
          <h4 style="font-size: 15px; font-weight: 800; color: #065f46; margin: 2px 0 0;">
            Purchase Plan Confirmed / खरीद योजना की पुष्टि
          </h4>
        </div>
        <span class="status-badge accepted">
          <i class="fa-solid fa-circle-check"></i> Plan Confirmed
        </span>
      </div>
      <p style="font-size: 13px; color: #047857; margin: 0 0 10px;">
        Materials have been split and confirmed across ${orderCount} selected sellers. Separate orders are generated and in fulfillment.
      </p>
      <div style="display: flex; justify-content: flex-end; gap: 8px;">
        <a href="my-orders.html?ref=${req.id}" class="btn-card-action" style="font-size: 12px; padding: 6px 12px; background: #059669; color: white; border: none; text-decoration: none; border-radius: 6px;">
          <i class="fa-solid fa-boxes-packing mr-1"></i> Track Seller Orders / ऑर्डर ट्रैक करें
        </a>
      </div>
    </div>
  `;
}

/* =========================================================
   BUILDBID - MY REQUESTS JAVASCRIPT (my-requests.js)
   Customer Role Only — Static UI & Quotation Management
   ========================================================= */

// Ensure environment safety
const API_BASE_URL = (typeof window !== "undefined" && window.location && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"))
  ? "http://localhost:8080"
  : "https://buildbid-ap3j.onrender.com";

/* =========================================================
   1. STATIC REQUESTS & QUOTATIONS DATASET (MODEL)
   ========================================================= */
const INITIAL_REQUESTS_DATA = [
    {
    id: "BB-REQ-001",
    type: "DIRECT_BUY",
    isDirectBuy: true,
    noQuotationsAllowed: true,
    typeLabel: "Direct Material Purchase",
    title: "OPC 53 Grade Cement (UltraTech)",
    category: "Building Material",
    material: "OPC 53 Grade Cement",
    quantity: "100 Bags (50kg each)",
    targetProvider: "ABC Building Materials",
    sellerName: "ABC Building Materials",
    sellerPhone: "+91 98112 34567",
    sellerLocation: "Sector 63, Noida",
    unitPrice: 380,
    totalPrice: 38000,
    expectedDeliveryDate: "Tomorrow by 4:00 PM",
    location: "Sector 62, Noida, Uttar Pradesh",
    deliverySite: "Plot 42, Block B, Industrial Corridor",
    submittedDate: "Today, 10:30 AM",
    submittedTimestamp: Date.now() - 2 * 60 * 60 * 1000,
    status: "Waiting for Acceptance",
    statusEn: "Waiting for Acceptance",
    statusHi: "विक्रेता की स्वीकृति की प्रतीक्षा",
    description: "Urgent direct material purchase request for 100 bags 53 grade cement. Sent directly to ABC Building Materials and waiting for seller acceptance."
  },
  {
    id: "BB-REQ-002",
    type: "MATERIAL_REQUIREMENT",
    typeLabel: "Material Requirement",
    title: "Fe-550D TMT Steel Rebars (12mm & 16mm)",
    category: "Structural Steel",
    material: "Fe-550D Primary TMT Steel (Tata Tiscon / Jindal Panther)",
    quantity: "2.5 Metric Tons (12mm: 1.5 MT, 16mm: 1.0 MT)",
    items: [
      { id: "item-201", materialName: "Tata Tiscon Fe-550D 12mm Rebars", quantity: 1500, unit: "kg" },
      { id: "item-202", materialName: "Tata Tiscon Fe-550D 16mm Rebars", quantity: 1000, unit: "kg" }
    ],
    location: "Greater Noida West (Noida Extension)",
    deliverySite: "Gaur City 2, Tower 7 Construction Zone",
    submittedDate: "Yesterday, 03:15 PM",
    submittedTimestamp: Date.now() - 24 * 60 * 60 * 1000,
    status: "Active",
    description: "Requirement for 2.5 MT Fe-550D earthquake resistant TMT rebars with standard 12 meter bundle lengths. Need factory weighbridge slips and bend test certificates.",
    quotations: [
      {
        id: "BB-QT-201",
        providerName: "Apex Steel & Infrastructure Corp",
        providerType: "MATERIAL_SELLER",
        providerTypeLabel: "Material Seller",
        rating: 4.9,
        reviewsCount: 54,
        isVerified: true,
        location: "Ecotech 3, Greater Noida",
        phone: "+91 98234 11223",
        email: "quotes@apexsteelcorp.in",
        quotedAmount: 148000,
        timeline: "4 Days",
        validity: "10 Days",
        warranty: "Mill Test Certificate (MTC) Attached",
        paymentTerms: "40% Advance, 60% on Weighbridge Slip",
        submittedAgo: "5 hours ago",
        status: "Received",
        costBreakdown: {
          items: [
            { name: "Tata Tiscon Fe-550D 12mm Rebars", qty: "1.5 MT", rate: 58000, amount: 87000 },
            { name: "Tata Tiscon Fe-550D 16mm Rebars", qty: "1.0 MT", rate: 56000, amount: 56000 }
          ],
          labour: 1500,
          freight: 3500,
          taxes: 0,
          total: 148000
        },
        terms: {
          payment: "40% advance with PO, 60% after electronic weighbridge slip verification.",
          warranty: "Standard Tata Steel manufacturing guarantee with heat number stamping.",
          included: ["Hydraulic crane offloading", "Bundle tagging", "MTC documentation"],
          excluded: ["Bar bending and cutting on site"]
        },
        message: "Authorized primary distributor for Tata Tiscon. Direct factory bundles with test certificate."
      },
      {
        id: "BB-QT-202",
        providerName: "Kisan Iron & Steel Mart",
        providerType: "MATERIAL_SELLER",
        providerTypeLabel: "Material Seller",
        rating: 4.8,
        reviewsCount: 31,
        isVerified: true,
        location: "Dadri Road, Greater Noida",
        phone: "+91 97180 99887",
        email: "kisansteel@gmail.com",
        quotedAmount: 152500,
        timeline: "3 Days",
        validity: "7 Days",
        warranty: "ISI Mark Fe-550D Guaranteed",
        paymentTerms: "50% Advance, 50% on Delivery",
        submittedAgo: "8 hours ago",
        status: "Received",
        costBreakdown: {
          items: [
            { name: "Jindal Panther Fe-550D 12mm", qty: "1.5 MT", rate: 59500, amount: 89250 },
            { name: "Jindal Panther Fe-550D 16mm", qty: "1.0 MT", rate: 58250, amount: 58250 }
          ],
          labour: 2000,
          freight: 3000,
          taxes: 0,
          total: 152500
        },
        terms: {
          payment: "50% booking amount, remainder before truck gate pass release.",
          warranty: "Full 100% replacement in case of weight variation > 1.5%.",
          included: ["Weighbridge test report", "Transit transit insurance"],
          excluded: ["Manual stacking"]
        },
        message: "Jindal Panther brand genuine stock with high corrosion resistance (CRS) properties."
      },
      {
        id: "BB-QT-203",
        providerName: "Kamdhenu Authorized Stockyard",
        providerType: "MATERIAL_SELLER",
        providerTypeLabel: "Material Seller",
        rating: 4.7,
        reviewsCount: 26,
        isVerified: true,
        location: "Site 4, Sahibabad Industrial Area",
        phone: "+91 98101 22334",
        email: "kamdhenu.hub@delhisteel.com",
        quotedAmount: 145000,
        timeline: "5 Days",
        validity: "12 Days",
        warranty: "Manufacturer Physical & Chemical Test Certificate",
        paymentTerms: "30% Advance, 70% Post Inspection",
        submittedAgo: "12 hours ago",
        status: "Received",
        costBreakdown: {
          items: [
            { name: "Kamdhenu Nxt Fe-550D 12mm", qty: "1.5 MT", rate: 57000, amount: 85500 },
            { name: "Kamdhenu Nxt Fe-550D 16mm", qty: "1.0 MT", rate: 55500, amount: 55500 }
          ],
          labour: 1500,
          freight: 2500,
          taxes: 0,
          total: 145000
        },
        terms: {
          payment: "30% token advance, balance 70% after delivery and sample caliper check.",
          warranty: "Standard Kamdhenu brand warranty.",
          included: ["Delivery at site", "Free binding wire 25kg spool"],
          excluded: ["Crane charges if access blocked"]
        },
        message: "Most competitive quote with bonus 25kg binding wire bundle included free of charge."
      },
      {
        id: "BB-QT-204",
        providerName: "XYZ Construction & Material Supply",
        providerType: "CONTRACTOR",
        providerTypeLabel: "Contractor",
        rating: 4.8,
        reviewsCount: 65,
        isVerified: true,
        location: "Sector 18, Noida",
        phone: "+91 99991 44556",
        email: "commercial@xyzinfra.co.in",
        quotedAmount: 155000,
        timeline: "2 Days (Express)",
        validity: "15 Days",
        warranty: "1 Year Structural Material Liability",
        paymentTerms: "50% Advance, 50% Handover",
        submittedAgo: "1 day ago",
        status: "Received",
        costBreakdown: {
          items: [
            { name: "SAIL TMT Fe-550D 12mm & 16mm", qty: "2.5 MT Combined", rate: 58000, amount: 145000 }
          ],
          labour: 5000,
          freight: 5000,
          taxes: 0,
          total: 155000
        },
        terms: {
          payment: "Milestone payment structure with formal contractor tax invoice.",
          warranty: "Contractor backed structural compliance certificate.",
          included: ["Delivery", "Complete on-site bar cutting & bending layout as per BBS drawing"],
          excluded: ["Tieing on slab"]
        },
        message: "Includes optional bar bending schedule (BBS) cutting and bending so your masons can start tieing immediately."
      }
    ]
  },
  {
    id: "BB-REQ-003",
    type: "DIRECT_HIRE",
    typeLabel: "Direct Hire Request",
    title: "Complete 3-BHK Electrical Rewiring & DB Panel Setup",
    category: "Electrical Work",
    service: "Concealed Wiring & Distribution Board Installation",
    quantity: "1 Apartment (1,750 sq.ft, 3 BHK)",
    targetProvider: "Raj Electrical & Automation Services (Professional)",
    location: "Indirapuram, Ghaziabad, Uttar Pradesh",
    deliverySite: "Flat 402, Shipra Sun City",
    submittedDate: "2 days ago, 04:45 PM",
    submittedTimestamp: Date.now() - 48 * 60 * 60 * 1000,
    status: "Waiting for Acceptance",
    statusEn: "Waiting for Acceptance",
    statusHi: "स्वीकृति की प्रतीक्षा",
    rawStatus: "WAITING_FOR_ACCEPTANCE",
    description: "Direct hire request sent to certified electrical technician for complete apartment rewiring: conduit grooving, copper wire pulling (Finolex/Polycab), 8-way distribution board setup with RCCB, inverter changeover switch, and modular switchboard box fitting.",
    quotations: []
  },
  {
    id: "BB-REQ-004",
    type: "PROJECT_REQUIREMENT",
    typeLabel: "Project Requirement",
    title: "Turnkey G+2 Residential Villa Construction (3,200 sq.ft)",
    category: "Full Construction",
    service: "Turnkey Residential Civil Structure & Finishing",
    quantity: "3,200 Sq.Ft Built-Up Area (Plot Size: 250 Sq.Yards)",
    location: "Sector 150, Noida Expressway, Uttar Pradesh",
    deliverySite: "Plot 88, Green Meadows Township",
    submittedDate: "3 days ago, 11:20 AM",
    submittedTimestamp: Date.now() - 72 * 60 * 60 * 1000,
    status: "Active",
    description: "Looking for reputable licensed contractor for G+2 residential villa construction. Complete turnkey scope including soil excavation, RCC raft foundation, columns, beam & slab casting, fly-ash brick masonry, internal/external plaster, water-proofing, and plumbing/electrical conduits.",
    quotations: [
      {
        id: "BB-QT-401",
        providerName: "XYZ Construction Services & Infra",
        providerType: "CONTRACTOR",
        providerTypeLabel: "Contractor",
        rating: 4.9,
        reviewsCount: 88,
        isVerified: true,
        location: "Sector 18, Noida",
        phone: "+91 99991 44556",
        email: "commercial@xyzinfra.co.in",
        quotedAmount: 4250000,
        timeline: "180 Days",
        validity: "30 Days",
        warranty: "5 Years Structural Guarantee",
        paymentTerms: "6 Stage-wise Milestones",
        submittedAgo: "1 day ago",
        status: "Received",
        costBreakdown: {
          items: [
            { name: "Excavation, Foundation Raft & Plinth Beam", qty: "Milestone 1", rate: 750000, amount: 750000 },
            { name: "Ground, 1st & 2nd Floor RCC Frame & Slab Casting", qty: "Milestone 2", rate: 1650000, amount: 1650000 },
            { name: "Brick Masonry & External Plastering", qty: "Milestone 3", rate: 850000, amount: 850000 },
            { name: "Internal Gypsum Plaster & Waterproofing Treatment", qty: "Milestone 4", rate: 550000, amount: 550000 },
            { name: "Plumbing Lines, Electrical Conduits & Parapet", qty: "Milestone 5", rate: 450000, amount: 450000 }
          ],
          labour: 0,
          freight: 0,
          taxes: 0,
          total: 4250000
        },
        terms: {
          payment: "Stage 1: Plinth (15%), Stage 2: GF Slab (20%), Stage 3: 1F Slab (20%), Stage 4: 2F Slab (15%), Stage 5: Brickwork (20%), Handover (10%).",
          warranty: "5 years comprehensive warranty on concrete structure and roof waterproofing.",
          included: ["UltraTech 43/53 cement", "Tata Tiscon Fe550 steel", "RMC batch plant mix", "Site engineer supervision", "CCTV live feed"],
          excluded: ["Interior painting, flooring tiles, wood doors (civil structure package)"]
        },
        message: "Grade-A certified construction firm with 45+ completed villas in Noida Expressway. Comprehensive QA/QC reports provided at every pour."
      },
      {
        id: "BB-QT-402",
        providerName: "Shivaay Buildcon Pvt Ltd",
        providerType: "CONTRACTOR",
        providerTypeLabel: "Contractor",
        rating: 4.8,
        reviewsCount: 47,
        isVerified: true,
        location: "Sector 135, Noida",
        phone: "+91 98115 00998",
        email: "contact@shivaaybuildcon.com",
        quotedAmount: 3980000,
        timeline: "210 Days",
        validity: "20 Days",
        warranty: "3 Years Structural Warranty",
        paymentTerms: "5 Milestones Linked to Work Completion",
        submittedAgo: "2 days ago",
        status: "Received",
        costBreakdown: {
          items: [
            { name: "Turnkey Grey Structure Construction (Rate @ ₹1,243/sq.ft)", qty: "3200 Sq.Ft", rate: 1243.75, amount: 3980000 }
          ],
          labour: 0,
          freight: 0,
          taxes: 0,
          total: 3980000
        },
        terms: {
          payment: "10% Advance mobilization, 25% Plinth, 25% Structure, 25% Brick & Plaster, 15% Final Handover.",
          warranty: "3 years structural crack & seepage warranty.",
          included: ["Branded cement & steel", "Complete shuttering plates & scaffolding", "Cube testing lab reports"],
          excluded: ["Sanitary ware & electrical fixtures"]
        },
        message: "Highly competitive grey-structure quote with experienced site team. Can share address of our current running site in Sector 150 for your physical inspection."
      },
      {
        id: "BB-QT-403",
        providerName: "Urban Nest Builders & Developers",
        providerType: "CONTRACTOR",
        providerTypeLabel: "Contractor",
        rating: 4.7,
        reviewsCount: 39,
        isVerified: true,
        location: "Sector 128, Noida",
        phone: "+91 99110 33445",
        email: "info@urbannest.in",
        quotedAmount: 4420000,
        timeline: "160 Days (Fast-Track)",
        validity: "25 Days",
        warranty: "5 Years Full Structure & Leakage Guarantee",
        paymentTerms: "7 Stage-wise Micro-payments",
        submittedAgo: "2 days ago",
        status: "Received",
        costBreakdown: {
          items: [
            { name: "Full Structural Work with Aluminium Formwork (Mivan/Plywood mix)", qty: "3200 Sq.Ft", rate: 1381.25, amount: 4420000 }
          ],
          labour: 0,
          freight: 0,
          taxes: 0,
          total: 4420000
        },
        terms: {
          payment: "Weekly progress based billing with third-party architectural sign-off.",
          warranty: "Bonded 5-year bank guarantee for structural soundness.",
          included: ["Double waterproofing layer", "Thermal insulation on roof", "Anti-termite treatment"],
          excluded: ["Architectural drawing fees (already available)"]
        },
        message: "Fast-track execution using motorized concrete pumps and mechanized shuttering to save 2 months time without quality compromise."
      },
      {
        id: "BB-QT-404",
        providerName: "Noida Elite Construction Works",
        providerType: "CONTRACTOR",
        providerTypeLabel: "Contractor",
        rating: 4.6,
        reviewsCount: 22,
        isVerified: false,
        location: "Bhangel, Sector 106, Noida",
        phone: "+91 98109 88776",
        email: "elitebuilders.noida@gmail.com",
        quotedAmount: 4100000,
        timeline: "190 Days",
        validity: "15 Days",
        warranty: "2.5 Years Structural Guarantee",
        paymentTerms: "5 Milestones",
        submittedAgo: "3 days ago",
        status: "Received",
        costBreakdown: {
          items: [
            { name: "Complete Civil Shell Construction", qty: "3200 Sq.Ft", rate: 1281.25, amount: 4100000 }
          ],
          labour: 0,
          freight: 0,
          taxes: 0,
          total: 4100000
        },
        terms: {
          payment: "Standard milestone schedule as per CPWD norms.",
          warranty: "2.5 years structural and plaster warranty.",
          included: ["Civil structure", "Brickwork", "Conduiting", "Boundary wall up to 5ft"],
          excluded: ["Main gate & exterior pavers"]
        },
        message: "Local Noida team with direct labour gang. Low overheads allow us to pass significant cost savings to you."
      },
      {
        id: "BB-QT-405",
        providerName: "DesignCraft Structural Consultants & Engineers",
        providerType: "PROFESSIONAL",
        providerTypeLabel: "Professional",
        rating: 4.9,
        reviewsCount: 34,
        isVerified: true,
        location: "Sector 62, Noida",
        phone: "+91 97110 55667",
        email: "projects@designcraftengineers.com",
        quotedAmount: 4300000,
        timeline: "175 Days",
        validity: "30 Days",
        warranty: "4 Years Structural Assurance Certificate",
        paymentTerms: "Bi-Weekly Measurement Book (MB) Billing",
        submittedAgo: "3 days ago",
        status: "Received",
        costBreakdown: {
          items: [
            { name: "Architect-Led Execution & Structural Supervision", qty: "3200 Sq.Ft", rate: 1343.75, amount: 4300000 }
          ],
          labour: 0,
          freight: 0,
          taxes: 0,
          total: 4300000
        },
        terms: {
          payment: "Transparent item-rate measurement book verified every 15 days.",
          warranty: "Signed structural stability certificate issued by chartered engineer.",
          included: ["Senior structural engineer on site every casting day", "Daily photo log via WhatsApp portal"],
          excluded: ["Municipal liaison fees"]
        },
        message: "Engineering-first contractor approach ensuring zero structural deviations and exact adherence to IS 456:2000 codes."
      }
    ]
  },
  {
    id: "BB-REQ-005",
    type: "MATERIAL_REQUIREMENT",
    typeLabel: "Material Requirement",
    title: "Vitrified Glazed Floor Tiles (600x1200mm, High Gloss)",
    category: "Tiles & Flooring",
    material: "First Quality GVT Vitrified Tiles (Kajaria / Somany)",
    quantity: "850 Sq. Meters (approx 360 Boxes)",
    location: "Sector 76, Noida, Uttar Pradesh",
    deliverySite: "Amrapali Silicon City, Flat A-1102",
    submittedDate: "Today, 08:15 AM",
    submittedTimestamp: Date.now() - 45 * 60 * 1000, // 45 mins ago
    status: "Pending",
    description: "Looking for wholesale supply of 600x1200mm vitrified tiles with Statuario Italian marble pattern. Must be premium grade with no corner chips and consistent shade numbers.",
    quotations: [] // ZERO QUOTATIONS (Tests Section 22 "No Quotations Yet" State)
  },
  {
    id: "BB-REQ-006",
    type: "DIRECT_HIRE",
    typeLabel: "Direct Hire Request",
    title: "Soil Core Drilling & Geotechnical Bearing Capacity Testing",
    category: "Engineering Survey",
    service: "Geotechnical Core Drilling & Lab Soil Report",
    quantity: "3 Boreholes (15 Meter Depth each)",
    targetProvider: "Dr. Verma Geo-Tech Consultants (Professional)",
    location: "Yamuna Expressway, Sector 22D, Greater Noida",
    deliverySite: "Plot 14, Industrial Cluster",
    submittedDate: "5 days ago",
    submittedTimestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
    status: "Accepted",
    statusEn: "Accepted",
    statusHi: "स्वीकार किया गया",
    rawStatus: "ACCEPTED",
    description: "Direct hire for geotechnical investigation and soil bearing capacity test for structural design of warehouse. Required standard penetration test (SPT) and laboratory grain size analysis report.",
    quotations: []
  },
  {
    id: "BB-REQ-007",
    type: "DIRECT_BUY",
    typeLabel: "Direct Material Purchase",
    title: "First-Class Kiln-Burned Red Clay Bricks (10,000 Pcs)",
    category: "Bricks & Blocks",
    material: "First-Class Red Clay Bricks (190 x 90 x 90 mm)",
    quantity: "10,000 Bricks (approx 2 Trucks)",
    targetProvider: "Gautam Buddha Brick Kiln Traders",
    location: "Sector 142, Noida Expressway, UP",
    deliverySite: "Plot 19, Commercial Sector",
    submittedDate: "4 days ago, 02:00 PM",
    submittedTimestamp: Date.now() - 96 * 60 * 60 * 1000,
    status: "Active",
    description: "Procurement of 10,000 kiln-burned red clay bricks with uniform cherry red color, sharp edges, and minimum 10.5 N/mm² compressive strength.",
    quotations: [
      {
        id: "BB-QT-701",
        providerName: "Gautam Buddha Brick Kiln Traders",
        providerType: "MATERIAL_SELLER",
        providerTypeLabel: "Material Seller",
        rating: 4.8,
        reviewsCount: 35,
        isVerified: true,
        location: "Chhapraula, Greater Noida",
        phone: "+91 98114 22331",
        email: "gb.bricks@gmail.com",
        quotedAmount: 72000,
        timeline: "3 Days",
        validity: "14 Days",
        warranty: "Guaranteed < 2% Breakage Rate",
        paymentTerms: "40% Advance, 60% on Delivery",
        submittedAgo: "2 days ago",
        status: "Received",
        costBreakdown: {
          items: [
            { name: "Grade-1 Red Clay Bricks (10,000 pcs)", qty: "10,000 Pcs", rate: 6.8, amount: 68000 }
          ],
          labour: 2000,
          freight: 2000,
          taxes: 0,
          total: 72000
        },
        terms: {
          payment: "40% advance booking, balance 60% upon counting and offloading at site.",
          warranty: "Replacement for broken pieces beyond 200 bricks per truckload.",
          included: ["Truck freight", "Manual offloading and stacking in neat piles"],
          excluded: ["Carrying beyond 20 meters"]
        },
        message: "Fresh kiln batch with metallic ringing sound. Delivery in 2 covered trucks with skilled unloading labour included."
      }
    ]
  },
  {
    id: "BB-REQ-008",
    type: "MATERIAL_REQUIREMENT",
    typeLabel: "Material Requirement",
    title: "RMC Ready Mix Concrete M25 Grade (45 Cu.M)",
    category: "Ready Mix Concrete",
    material: "Design Mix M25 Grade Concrete with Flyash Additive",
    quantity: "45 Cubic Meters (approx 6 Transit Mixers)",
    location: "Sector 137, Noida, Uttar Pradesh",
    deliverySite: "Tower B Foundation Raft, Paras Tierea",
    submittedDate: "Yesterday, 11:45 AM",
    submittedTimestamp: Date.now() - 22 * 60 * 60 * 1000,
    status: "Active",
    description: "Requirement for 45 cu.m M25 grade RMC for second floor roof slab. Pumping with 36-meter boom placer required. Slump required 120 ± 25 mm.",
    quotations: [
      {
        id: "BB-QT-801",
        providerName: "Prism RMC Batching Plant Ltd",
        providerType: "MATERIAL_SELLER",
        providerTypeLabel: "Material Seller",
        rating: 4.9,
        reviewsCount: 62,
        isVerified: true,
        location: "Sector 80, Phase 2, Noida",
        phone: "+91 99118 77662",
        email: "rmc.noida@prismjohnson.in",
        quotedAmount: 189000,
        timeline: "1 Day (Continuous Pour)",
        validity: "7 Days",
        warranty: "28-Day Cube Compressive Test Guarantee",
        paymentTerms: "100% on Dispatch / Transit Pass",
        submittedAgo: "18 hours ago",
        status: "Received",
        costBreakdown: {
          items: [
            { name: "M25 Grade Ready Mix Concrete (45 Cu.M)", qty: "45 Cu.M", rate: 3900, amount: 175500 }
          ],
          labour: 4500,
          freight: 9000,
          taxes: 0,
          total: 189000
        },
        terms: {
          payment: "Payment against weighbridge and batch slip per transit mixer.",
          warranty: "Full batch test report and 7/28 day sample cube testing at automated lab.",
          included: ["Boom pump deployment", "6 concrete cubes cast on-site", "Slump cone test"],
          excluded: ["Delay charges beyond 45 mins per mixer"]
        },
        message: "Automated batching plant with computerized weigh scales. Can guarantee continuous interval pour without cold joints."
      },
      {
        id: "BB-QT-802",
        providerName: "UltraTech Concrete Hub",
        providerType: "MATERIAL_SELLER",
        providerTypeLabel: "Material Seller",
        rating: 4.9,
        reviewsCount: 94,
        isVerified: true,
        location: "Ecotech 1, Greater Noida",
        phone: "+91 98110 55443",
        email: "rmc.greaternoida@ultratechcement.com",
        quotedAmount: 195000,
        timeline: "1 Day",
        validity: "10 Days",
        warranty: "IS 456 & IS 4926 Quality Certified",
        paymentTerms: "50% Advance, 50% Post-Pour",
        submittedAgo: "15 hours ago",
        status: "Received",
        costBreakdown: {
          items: [
            { name: "UltraTech M25 Concrete Mix (45 Cu.M)", qty: "45 Cu.M", rate: 4000, amount: 180000 }
          ],
          labour: 5000,
          freight: 10000,
          taxes: 0,
          total: 195000
        },
        terms: {
          payment: "50% advance for batch booking, remainder 50% upon final mixer offload.",
          warranty: "Certified by UltraTech technical services cell with cube crush report.",
          included: ["Static pump with 100m pipeline", "On-site quality officer"],
          excluded: ["Extra piping beyond 100m"]
        },
        message: "Direct manufacturer supply with high-durability polymer admixtures for superior surface finish."
      }
    ]
  },
  {
    id: "BB-REQ-009",
    type: "DIRECT_HIRE",
    typeLabel: "Direct Hire Request",
    title: "Plumbing Line Pressure Testing & Sensor Faucet Fitting",
    category: "Plumbing & Sanitation",
    service: "Commercial Plumbing & Leakage Pressure Testing",
    quantity: "4 Bathrooms & Kitchenette",
    targetProvider: "Apex Plumbing Solutions (Professional)",
    location: "Sector 104, Noida, Uttar Pradesh",
    deliverySite: "Office Suite 301, Star Chambers",
    submittedDate: "3 days ago, 05:30 PM",
    submittedTimestamp: Date.now() - 75 * 60 * 60 * 1000,
    status: "Waiting for Acceptance",
    statusEn: "Waiting for Acceptance",
    statusHi: "स्वीकृति की प्रतीक्षा",
    rawStatus: "WAITING_FOR_ACCEPTANCE",
    description: "Direct hire inquiry sent for hydraulic pressure testing of CPVC lines at 10 kg/cm² and installation of sensor-operated commercial basin taps and dual-flush cisterns.",
    quotations: []
  },
  {
    id: "BB-REQ-010",
    type: "PROJECT_REQUIREMENT",
    typeLabel: "Project Requirement",
    title: "Boundary Wall & Gate Pillar Construction (120 Rft)",
    category: "Civil Works",
    service: "Compound Wall Masonry, Foundation & Plastering",
    quantity: "120 Running Feet (7ft Height with 4 RCC Columns)",
    location: "Sector 144, Noida, Uttar Pradesh",
    deliverySite: "Farmhouse Plot 12, Sector 144",
    submittedDate: "4 days ago, 09:10 AM",
    submittedTimestamp: Date.now() - 98 * 60 * 60 * 1000,
    status: "Active",
    description: "Post requirement for 120 rft perimeter boundary wall with 2ft foundation depth, 9-inch brickwork up to 7ft height, coping slab, and 2 main gate pillars with electrical conduit provision.",
    quotations: [] // ZERO QUOTATIONS
  },
  {
    id: "BB-REQ-011",
    type: "DIRECT_BUY",
    typeLabel: "Direct Material Purchase",
    title: "Coarse Yamuna River Sand (Zone II) - 600 Cu.Ft",
    category: "Aggregates & Sand",
    material: "Screened Coarse River Sand (Zone-II Plastering Grade)",
    quantity: "600 Cubic Feet (1 Full Dumper Truck)",
    targetProvider: "Ganga Yamuna Sand Traders",
    location: "Sector 78, Noida, Uttar Pradesh",
    deliverySite: "Mahagun Moderne, Plot 3",
    submittedDate: "10 days ago",
    submittedTimestamp: Date.now() - 10 * 24 * 60 * 60 * 1000,
    status: "Completed",
    description: "Procurement of 600 cu.ft washed coarse river sand for brickwork and external plastering.",
    quotations: []
  },
  {
    id: "BB-REQ-012",
    type: "MATERIAL_REQUIREMENT",
    typeLabel: "Material Requirement",
    title: "Exterior Weathercoat Emulsion Paint (200 Litres)",
    category: "Paints & Coatings",
    material: "Asian Paints Apex Ultima Exterior Emulsion (Pure White)",
    quantity: "200 Litres (10 Buckets of 20L each)",
    location: "Sector 50, Noida, Uttar Pradesh",
    deliverySite: "B-24, Sector 50",
    submittedDate: "12 days ago",
    submittedTimestamp: Date.now() - 12 * 24 * 60 * 60 * 1000,
    status: "Cancelled",
    description: "Requirement for 200L exterior acrylic emulsion with silicon additives for facade painting. Cancelled due to change in architect specification.",
    quotations: []
  }
];

// In-Memory state clone for interactive UI actions
let currentRequests = JSON.parse(JSON.stringify(INITIAL_REQUESTS_DATA));

// Track active request and quotation for modals
let activeRequestId = null;
let activeQuotationId = null;
let currentModalViewMode = "cards"; // "cards" or "compare"

/* =========================================================
   2. DOM READY INITIALIZATION & DYNAMIC INTEGRATION
   ========================================================= */
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

document.addEventListener("DOMContentLoaded", async () => {
  // Sync Customer Profile Info
  syncUserProfileUI();

  // Setup Event Listeners
  setupToolbarListeners();
  setupModalKeyboardHandlers();

  // Load Customer Requests from Backend (Direct Buy, Material Req, Direct Hire)
  await loadCustomerRequests();
});

async function loadCustomerRequests() {
  const token = getCleanToken();
  if (token) {
    // Authenticated customer: never display static mock/demo data
    currentRequests = [];
    try {
      const res = await fetch(`${API_BASE_URL}/api/customer/my-requests`, {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        }
      });
      if (!res.ok) {
        console.warn(`Customer requests API responded with status ${res.status}. Displaying empty state.`);
        currentRequests = [];
      } else {
        const liveData = await res.json();
        const rawRequests = Array.isArray(liveData) ? liveData : [];

        // For MATERIAL_REQUIREMENT, retrieve real quotations via typed endpoint
        await Promise.all(rawRequests.map(async (req) => {
          if (req.type === "MATERIAL_REQUIREMENT") {
            const matId = req.backendId || req.id;
            try {
              const qRes = await fetch(`${API_BASE_URL}/api/customer/requests/MATERIAL_REQUIREMENT/${matId}/quotations`, {
                method: "GET",
                headers: {
                  "Authorization": "Bearer " + token,
                  "Content-Type": "application/json"
                }
              });
              if (qRes.ok) {
                const quotes = await qRes.json();
                req.quotations = Array.isArray(quotes) ? quotes.map(normalizeQuotationForUI) : [];
              } else {
                req.quotations = [];
              }
            } catch (qErr) {
              console.warn(`Failed to fetch quotations for material request ${matId}:`, qErr);
              req.quotations = [];
            }
          } else {
            // DIRECT_BUY and DIRECT_HIRE do not load quotations in this phase
            req.quotations = [];
          }
        }));

        currentRequests = rawRequests;
      }
    } catch (err) {
      console.warn("Live customer requests API connection failed. Displaying empty state:", err);
      currentRequests = [];
    }
  }

  // Render Initial Metrics & Requests List
  renderSummaryMetrics();
  renderRequests();
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return "Recently";
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (isNaN(diffMs)) return "Recently";
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch (e) {
    return "Recently";
  }
}

function normalizeQuotationForUI(quote) {
  const includedList = quote.terms?.included || (quote.includedItems ? quote.includedItems.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean) : ["Standard Delivery & Loading"]);
  const excludedList = quote.terms?.excluded || (quote.excludedItems ? quote.excludedItems.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean) : ["Offloading to Upper Floors"]);

  return {
    id: quote.quotationId || quote.id,
    quotationId: quote.quotationId || quote.id,
    backendId: quote.backendId || quote.id,
    providerId: quote.providerId,
    providerName: quote.providerName || "Verified Supplier",
    providerType: quote.providerType || "MATERIAL_SELLER",
    providerTypeLabel: quote.providerTypeLabel || "Material Seller",
    rating: quote.rating || 4.8,
    reviewsCount: quote.reviewsCount || 15,
    isVerified: quote.isVerified !== undefined ? quote.isVerified : true,
    location: quote.providerLocation || quote.location || "Regional Supplier",
    phone: quote.providerPhone || quote.phone || "Contact via BuildBid",
    email: quote.providerEmail || quote.email || "support@buildbid.com",
    quotedAmount: quote.quotedAmount || quote.totalAmount || 0,
    materialAmount: quote.materialAmount || quote.materialCost || 0,
    materialCost: quote.materialCost || quote.materialAmount || 0,
    labourAmount: quote.labourAmount || quote.labourCost || 0,
    labourCost: quote.labourCost || quote.labourAmount || 0,
    transportation: quote.transportation || quote.transportationCost || 0,
    transportationCost: quote.transportationCost || quote.transportation || 0,
    taxes: quote.taxes || quote.taxGst || 0,
    taxGst: quote.taxGst || quote.taxes || 0,
    totalAmount: quote.totalAmount || quote.quotedAmount || 0,
    timeline: quote.timeline || "2-3 Days",
    warranty: quote.warranty || "Standard Manufacturer Warranty",
    paymentTerms: quote.paymentTerms || "100% on Site Delivery",
    validity: quote.validity || "7 Days",
    submittedAgo: quote.submittedAgo || (quote.createdAt ? formatTimeAgo(quote.createdAt) : "Just now"),
    status: quote.status || "Submitted",
    includedItems: quote.includedItems || "",
    excludedItems: quote.excludedItems || "",
    message: quote.message || "",
    createdAt: quote.createdAt || "",
    updatedAt: quote.updatedAt || "",
    items: quote.items || [],
    costBreakdown: {
      items: (quote.items && quote.items.length > 0)
        ? quote.items.map(it => ({
            name: it.materialName || it.name || "Material Item",
            qty: `${it.quantity != null ? it.quantity : (it.quotedQuantity != null ? it.quotedQuantity : 1)} ${it.unit || it.quotedUnit || ''}`.trim(),
            rate: it.unitPrice != null ? it.unitPrice : (it.rate || 0),
            amount: it.lineTotal != null ? it.lineTotal : (it.subtotal != null ? it.subtotal : (it.amount || 0))
          }))
        : (quote.costBreakdown?.items && quote.costBreakdown.items.length > 0)
        ? quote.costBreakdown.items.map(it => ({
            name: it.materialName || it.name || "Material Item",
            qty: it.qty || `${it.quantity != null ? it.quantity : (it.quotedQuantity != null ? it.quotedQuantity : 1)} ${it.unit || it.quotedUnit || ''}`.trim(),
            rate: it.rate != null ? it.rate : (it.unitPrice || 0),
            amount: it.amount != null ? it.amount : (it.lineTotal != null ? it.lineTotal : (it.subtotal || 0))
          }))
        : [{
            name: quote.includedItems || "Material Requirement Supply",
            qty: "1 Lot",
            rate: quote.materialCost || quote.quotedAmount || 0,
            amount: quote.materialCost || quote.quotedAmount || 0
          }],
      labour: quote.labourCost || quote.costBreakdown?.labour || 0,
      freight: quote.transportationCost || quote.costBreakdown?.freight || quote.transportation || 0,
      taxes: quote.taxGst || quote.costBreakdown?.taxes || quote.taxes || 0,
      total: quote.quotedAmount || quote.totalAmount || 0
    },
    terms: {
      payment: quote.paymentTerms || "Payment on Delivery",
      warranty: quote.warranty || "Standard Manufacturer Warranty",
      timeline: quote.timeline || "2-3 Days",
      validity: quote.validity || "7 Days",
      included: includedList,
      excluded: excludedList
    }
  };
}

/* =========================================================
   3. USER PROFILE SYNC (CONTINUITY & SHELL SAFETY)
   ========================================================= */
function syncUserProfileUI() {
  try {
    const rawUser = localStorage.getItem("currentUser") || 
                    localStorage.getItem("customerUser") || 
                    sessionStorage.getItem("userData") || "{}";
    const user = JSON.parse(rawUser);

    const navUserName = document.getElementById("navUserName");
    const navUserRole = document.getElementById("navUserRole");
    const navAvatar = document.getElementById("navAvatar");

    const displayName = user.name || user.fullName || user.username || "Customer";
    const firstName = displayName.split(" ")[0] || "Customer";

    if (navUserName) navUserName.textContent = firstName;
    if (navUserRole) navUserRole.textContent = "Customer";

    if (navAvatar && navAvatar.tagName === "IMG") {
      navAvatar.src = user.profilePhoto || 
                      user.avatarUrl || 
                      `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(firstName)}`;
    }
  } catch (e) {
    console.warn("User profile sync fallback:", e);
  }

  // Bind logout action
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn && !logoutBtn.dataset.bound) {
    logoutBtn.dataset.bound = "true";
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("token");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("customerUser");
      localStorage.removeItem("marketplaceToken");
      localStorage.removeItem("marketplaceUser");
      localStorage.removeItem("authToken");
      localStorage.removeItem("buildbid_user");
      localStorage.removeItem("buildbid_current_user");
      sessionStorage.removeItem("pendingRedirect");
      sessionStorage.removeItem("userData");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("currentUser");
      sessionStorage.clear();
      showLogoutToast(() => {
        window.location.href = "index.html";
      });
    });
  }
}

/* =========================================================
   4. METRICS COMPUTATION & RENDERING
   ========================================================= */
function renderSummaryMetrics() {
  const totalRequests = currentRequests.length;
  const pendingRequests = currentRequests.filter(r => {
    const s = (r.status || "").toLowerCase();
    const rs = (r.rawStatus || "").toLowerCase();
    return s === "pending" || s.includes("waiting") || rs === "pending" || rs.includes("waiting");
  }).length;
  const activeRequests = currentRequests.filter(r => {
    const s = (r.status || "").toLowerCase();
    const rs = (r.rawStatus || "").toLowerCase();
    return s === "active" || s.includes("accepted") || s.includes("processing") || s.includes("dispatch") || s.includes("delivery") || rs.includes("accepted") || rs.includes("processing") || rs.includes("dispatch") || rs.includes("delivery");
  }).length;
  const totalQuotations = currentRequests.reduce((sum, r) => sum + (r.quotations ? r.quotations.length : 0), 0);

  const totalEl = document.getElementById("statTotalRequests");
  const pendingEl = document.getElementById("statPendingRequests");
  const activeEl = document.getElementById("statActiveRequests");
  const quotesEl = document.getElementById("statQuotationsReceived");

  if (totalEl) totalEl.textContent = totalRequests;
  if (pendingEl) pendingEl.textContent = pendingRequests;
  if (activeEl) activeEl.textContent = activeRequests;
  if (quotesEl) quotesEl.textContent = totalQuotations;
}

/* =========================================================
   5. REQUESTS RENDERING & CARD GENERATION
   ========================================================= */
function renderRequests() {
  const container = document.getElementById("requestsContainer");
  const emptyState = document.getElementById("emptyStateBox");
  const countText = document.getElementById("resultsCountDisplay");

  if (!container) return;

  // Filter and Sort Requests
  const filtered = getFilteredAndSortedRequests();

  if (countText) {
    countText.innerHTML = `Showing <strong>${filtered.length}</strong> of <strong>${currentRequests.length}</strong> submitted requests`;
  }

  if (filtered.length === 0) {
    container.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  container.innerHTML = filtered.map(req => createRequestCardHTML(req)).join("");
}

function createRequestCardHTML(req) {
  const typeClass = (req.type || "").toLowerCase().replace(/_/g, "-");
  const quoteCount = req.quotations ? req.quotations.length : 0;
  const isDirectBuy = (req.type === "DIRECT_BUY" || req.isDirectBuy === true);
  const isDirectHire = (req.type === "DIRECT_HIRE");
  const isPlanConfirmed = (req.status === "Purchase Plan Confirmed" || req.status === "ALLOCATED" || (req.rawStatus || "").toUpperCase() === "ALLOCATED");

  // Determine Main Section State
  let quotationSectionHTML = "";
  if (isDirectBuy) {
    // FLOW A: DIRECT BUY NEVER RENDERS QUOTATION UI
    quotationSectionHTML = getDirectBuyTimelineHTML(req);
  } else if (isDirectHire) {
    // DIRECT HIRE HAS NO QUOTATION WORKFLOW WHATSOEVER
    quotationSectionHTML = "";
  } else if (isPlanConfirmed) {
    // FLOW B: PURCHASE PLAN CONFIRMED
    quotationSectionHTML = getConfirmedAllocationCardHTML(req);
  } else if (quoteCount === 0) {
    quotationSectionHTML = `
      <div class="card-quotation-section no-quotes">
        <div class="quotation-badge-meta">
          <div class="quote-icon-bubble">
            <i class="fa-regular fa-clock"></i>
          </div>
          <div class="quote-count-details">
            <span class="quote-count-label">Quotation Status / कोटेशन स्थिति</span>
            <span class="quote-count-heading">No Quotations Yet / कोई कोटेशन नहीं</span>
            <span class="quote-preview-providers">Waiting for verified sellers to respond to your requirement.</span>
          </div>
        </div>
        <button class="btn-waiting-quotes" title="Quotations will appear here once received" disabled>
          <i class="fa-solid fa-hourglass-half"></i> Waiting for Quotations / कोटेशन की प्रतीक्षा
        </button>
      </div>
    `;
  } else {
    const quoteLabel = quoteCount === 1 ? "1 Quotation Received / 1 कोटेशन प्राप्त" : `${quoteCount} Quotations Received / ${quoteCount} कोटेशन प्राप्त`;
    const btnLabel = "Compare Quotations / कोटेशन की तुलना करें";
    
    const previewProviders = req.quotations.map(q => q.providerName).slice(0, 2).join(", ") + 
      (req.quotations.length > 2 ? ` +${req.quotations.length - 2} more` : "");

    quotationSectionHTML = `
      <div class="card-quotation-section has-quotes">
        <div class="quotation-badge-meta">
          <div class="quote-icon-bubble">
            <i class="fa-solid fa-file-invoice-dollar"></i>
          </div>
          <div class="quote-count-details">
            <span class="quote-count-label">Quotation Received / कोटेशन प्राप्त</span>
            <span class="quote-count-heading">${quoteLabel}</span>
            <span class="quote-preview-providers">From: ${previewProviders}</span>
          </div>
        </div>
        <button class="btn-view-quotations" onclick="openQuotationsModal('${req.id}')">
          <i class="fa-solid fa-code-compare"></i> ${btnLabel}
        </button>
      </div>
    `;
  }

  // Detail Items based on Request Type
  let specificDetailsHTML = "";
  if (isDirectBuy) {
    specificDetailsHTML = `
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-cube"></i> Material & Specs</span>
        <span class="detail-value">${escapeHtml(req.material)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-scale-balanced"></i> Quantity</span>
        <span class="detail-value highlight-blue">${escapeHtml(req.quantity)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-store"></i> Selected Seller</span>
        <span class="detail-value">${escapeHtml(req.sellerName || req.targetProvider || "Verified Seller")}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-location-dot"></i> Delivery Site</span>
        <span class="detail-value">${escapeHtml(req.deliverySite || req.location)}</span>
      </div>
    `;
  } else if (req.type === "MATERIAL_REQUIREMENT") {
    specificDetailsHTML = `
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-layer-group"></i> Required Material</span>
        <span class="detail-value">${escapeHtml(req.material)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-weight-hanging"></i> Required Quantity</span>
        <span class="detail-value highlight-blue">${escapeHtml(req.quantity)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-location-dot"></i> Site Location</span>
        <span class="detail-value">${escapeHtml(req.location)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-truck-ramp-box"></i> Offloading Site</span>
        <span class="detail-value">${escapeHtml(req.deliverySite || req.location)}</span>
      </div>
    `;
  } else if (isDirectHire) {
    specificDetailsHTML = `
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-screwdriver-wrench"></i> Service Required</span>
        <span class="detail-value">${escapeHtml(req.service || req.title)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-user-check"></i> Targeted Provider</span>
        <span class="detail-value highlight-blue">${escapeHtml(req.targetProvider || "Independent Professional")}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-ruler-combined"></i> Scope / Volume</span>
        <span class="detail-value">${escapeHtml(req.quantity || "Direct Engagement")}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-location-dot"></i> Job Address</span>
        <span class="detail-value">${escapeHtml(req.location || "Site Location")}</span>
      </div>
    `;
  } else if (req.type === "PROJECT_REQUIREMENT") {
    specificDetailsHTML = `
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-trowel-bricks"></i> Construction Scope</span>
        <span class="detail-value">${escapeHtml(req.service)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-chart-area"></i> Built-up Area</span>
        <span class="detail-value highlight-blue">${escapeHtml(req.quantity)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-map-location-dot"></i> Plot Address</span>
        <span class="detail-value">${escapeHtml(req.location)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-hard-hat"></i> Contract Category</span>
        <span class="detail-value">Turnkey Structure Contract</span>
      </div>
    `;
  }

  // Footer Actions
  let footerButtonsHTML = "";
  if (isDirectBuy) {
    footerButtonsHTML = `
      <button class="btn-card-action primary-subtle" onclick="openRequestDetailsModal('${req.id}')">
        <i class="fa-solid fa-circle-info"></i> View Details
      </button>
      <a href="my-orders.html?ref=${req.id}" class="btn-card-action" style="color: #0284c7; text-decoration: none;">
        <i class="fa-solid fa-truck-ramp-box"></i> Track in My Orders
      </a>
      ${(req.sellerPhone) ? `
        <button class="btn-card-action" onclick="openContactProviderModal('${escapeHtml(req.sellerName || 'Seller')}', 'Material Seller', '${escapeHtml(req.sellerPhone)}', '')">
          <i class="fa-solid fa-phone"></i> Contact Seller
        </button>
      ` : ''}
    `;
  } else if (isDirectHire) {
    footerButtonsHTML = `
      <button class="btn-card-action primary-subtle" onclick="openRequestDetailsModal('${req.id}')">
        <i class="fa-solid fa-circle-info"></i> View Details
      </button>
      <button class="btn-card-action" onclick="handleEditRequest('${req.id}')">
        <i class="fa-solid fa-pen-to-square"></i> Edit Request
      </button>
      <button class="btn-card-action text-red" onclick="handleCancelRequestPrompt('${req.id}')">
        <i class="fa-solid fa-ban"></i> Cancel
      </button>
    `;
  } else {
    const editLabel = req.type.includes("REQUIREMENT") ? "Edit Requirement" : "Edit Request";
    const cancelLabel = req.type.includes("REQUIREMENT") ? "Cancel Requirement" : "Cancel";
    footerButtonsHTML = `
      <button class="btn-card-action primary-subtle" onclick="openRequestDetailsModal('${req.id}')">
        <i class="fa-solid fa-circle-info"></i> View Details
      </button>
      ${!isPlanConfirmed ? `
        <button class="btn-card-action" onclick="handleEditRequest('${req.id}')">
          <i class="fa-solid fa-pen-to-square"></i> ${editLabel}
        </button>
        <button class="btn-card-action text-red" onclick="handleCancelRequestPrompt('${req.id}')">
          <i class="fa-solid fa-ban"></i> ${cancelLabel}
        </button>
      ` : `
        <a href="my-orders.html?ref=${req.id}" class="btn-card-action" style="color: #059669; text-decoration: none;">
          <i class="fa-solid fa-boxes-stacked"></i> View My Orders
        </a>
      `}
    `;
  }

  // Card Header Status Badge Label & Style Class
  const sUpper = (req.rawStatus || req.status || "").toUpperCase();
  let badgeLabel = req.status;
  if (req.statusEn && req.statusHi) {
    badgeLabel = `${req.statusEn} / ${req.statusHi}`;
  } else if (isDirectHire) {
    if (sUpper.includes("ACCEPTED") || sUpper.includes("स्वीकार")) {
      badgeLabel = "Accepted / स्वीकार किया गया";
    } else {
      badgeLabel = "Waiting for Acceptance / स्वीकृति की प्रतीक्षा";
    }
  }

  let badgeClass = "pending";
  if (sUpper.includes("DELIVERED") || sUpper.includes("COMPLETED") || sUpper.includes("CLOSED")) {
    badgeClass = "completed";
  } else if (sUpper.includes("OUT_FOR_DELIVERY") || sUpper.includes("DISPATCH") || sUpper.includes("PROCESSING") || sUpper.includes("ACTIVE")) {
    badgeClass = "active";
  } else if (sUpper.includes("ACCEPTED") || sUpper.includes("स्वीकार")) {
    badgeClass = "accepted";
  } else if (sUpper.includes("CANCEL") || sUpper.includes("रद्द")) {
    badgeClass = "cancelled";
  } else if (sUpper.includes("DECLIN") || sUpper.includes("REJECT") || sUpper.includes("अस्वीकृत")) {
    badgeClass = "rejected";
  } else {
    badgeClass = "pending";
  }

  return `
    <div class="request-card" id="card-${req.id}">
      <!-- Header Bar -->
      <div class="card-header-bar">
        <div class="header-left-badges">
          <span class="type-badge ${typeClass}">
            <i class="fa-solid fa-tag"></i> ${req.typeLabel || req.type}
          </span>
          <span class="request-id-badge">${req.id}</span>
        </div>
        <div class="header-right-status">
          <span class="status-badge ${badgeClass}">
            <i class="fa-solid fa-circle-dot"></i> ${badgeLabel}
          </span>
        </div>
      </div>

      <!-- Content Body -->
      <div class="card-content-body">
        <div class="card-title-row">
          <h3 class="request-title">${req.title}</h3>
          <span class="request-submitted-time">
            <i class="fa-regular fa-clock"></i> ${req.submittedDate}
          </span>
        </div>

        <!-- Dynamic Specs Grid -->
        <div class="request-details-grid">
          ${specificDetailsHTML}
        </div>

        <!-- Description Note -->
        <p class="request-desc-text">
          <strong>Notes:</strong> ${req.description}
        </p>

        <!-- Dynamic Direct Buy or Quotation Section -->
        ${quotationSectionHTML}
      </div>

      <!-- Action Footer -->
      <div class="card-actions-footer">
        ${footerButtonsHTML}
      </div>
    </div>
  `;
}

/* =========================================================
   6. FILTERING & SORTING ENGINE
   ========================================================= */
function getFilteredAndSortedRequests() {
  const searchVal = (document.getElementById("requestSearchInput")?.value || "").trim().toLowerCase();
  const typeFilter = document.getElementById("requestTypeFilter")?.value || "ALL";
  const statusFilter = document.getElementById("requestStatusFilter")?.value || "ALL";
  const quoteFilter = document.getElementById("quotationStatusFilter")?.value || "ALL";
  const sortFilter = document.getElementById("requestSortFilter")?.value || "NEWEST";

  return currentRequests.filter(req => {
    // Search match
    if (searchVal) {
      const matchId = req.id.toLowerCase().includes(searchVal);
      const matchTitle = req.title.toLowerCase().includes(searchVal);
      const matchMaterial = (req.material || "").toLowerCase().includes(searchVal);
      const matchService = (req.service || "").toLowerCase().includes(searchVal);
      const matchLoc = (req.location || "").toLowerCase().includes(searchVal);
      const matchProvider = (req.targetProvider || "").toLowerCase().includes(searchVal);
      if (!matchId && !matchTitle && !matchMaterial && !matchService && !matchLoc && !matchProvider) {
        return false;
      }
    }

    // Type filter
    if (typeFilter !== "ALL" && req.type !== typeFilter) {
      return false;
    }

    // Status filter
    if (statusFilter !== "ALL") {
      const s = (req.status || "").toUpperCase();
      const rs = (req.rawStatus || "").toUpperCase();
      if (statusFilter === "PENDING") {
        const isPending = s.includes("PENDING") || s.includes("WAITING") || rs.includes("PENDING") || rs.includes("WAITING");
        if (!isPending) return false;
      } else if (statusFilter === "ACCEPTED") {
        const isAccepted = s.includes("ACCEPTED") || rs.includes("ACCEPTED");
        if (!isAccepted) return false;
      } else if (statusFilter === "ACTIVE") {
        const isActive = s.includes("ACTIVE") || s.includes("PROCESSING") || s.includes("DISPATCH") || s.includes("DELIVERY") || rs.includes("ACTIVE") || rs.includes("PROCESSING") || rs.includes("DISPATCH") || rs.includes("DELIVERY") || rs.includes("ACCEPTED");
        if (!isActive) return false;
      } else if (statusFilter === "COMPLETED") {
        const isCompleted = s.includes("COMPLETED") || s.includes("DELIVERED") || s.includes("CLOSED") || rs.includes("COMPLETED") || rs.includes("DELIVERED") || rs.includes("CLOSED");
        if (!isCompleted) return false;
      } else if (statusFilter === "CANCELLED") {
        const isCancelled = s.includes("CANCEL") || rs.includes("CANCEL");
        if (!isCancelled) return false;
      } else if (statusFilter === "REJECTED") {
        const isRejected = s.includes("REJECT") || s.includes("DECLIN") || rs.includes("REJECT") || rs.includes("DECLIN");
        if (!isRejected) return false;
      } else {
        if (s !== statusFilter && rs !== statusFilter) return false;
      }
    }

    // Quotation status filter (Direct Buy and Direct Hire have no quotation workflow)
    if (quoteFilter !== "ALL") {
      if (req.type === "DIRECT_BUY" || req.isDirectBuy === true || req.type === "DIRECT_HIRE") {
        return false;
      }
      const quoteCount = req.quotations ? req.quotations.length : 0;
      if (quoteFilter === "NO_QUOTES" && quoteCount > 0) return false;
      if (quoteFilter === "HAS_QUOTES" && quoteCount === 0) return false;
      if (quoteFilter === "MULTIPLE_QUOTES" && quoteCount <= 1) return false;
    }

    return true;
  }).sort((a, b) => {
    if (sortFilter === "OLDEST") {
      return a.submittedTimestamp - b.submittedTimestamp;
    }
    // Default NEWEST
    return b.submittedTimestamp - a.submittedTimestamp;
  });
}

function setupToolbarListeners() {
  const searchInput = document.getElementById("requestSearchInput");
  const typeFilter = document.getElementById("requestTypeFilter");
  const statusFilter = document.getElementById("requestStatusFilter");
  const quoteFilter = document.getElementById("quotationStatusFilter");
  const sortFilter = document.getElementById("requestSortFilter");
  const resetBtn = document.getElementById("btnResetFilters");

  if (searchInput) searchInput.addEventListener("input", renderRequests);
  if (typeFilter) typeFilter.addEventListener("change", renderRequests);
  if (statusFilter) statusFilter.addEventListener("change", renderRequests);
  if (quoteFilter) quoteFilter.addEventListener("change", renderRequests);
  if (sortFilter) sortFilter.addEventListener("change", renderRequests);

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (typeFilter) typeFilter.value = "ALL";
      if (statusFilter) statusFilter.value = "ALL";
      if (quoteFilter) quoteFilter.value = "ALL";
      if (sortFilter) sortFilter.value = "NEWEST";
      renderRequests();
      showToast("Filters reset", "All requests are now displayed.");
    });
  }
}

/* =========================================================
   7. VIEW QUOTATIONS MODAL (SECTIONS 11, 12, 13, 15, 36)
   ========================================================= */
async function openQuotationsModal(requestId) {
  const req = currentRequests.find(r => r.id === requestId);
  if (!req) return;

  const token = getCleanToken();
  if (token && req.type === "MATERIAL_REQUIREMENT") {
    const matId = req.backendId || req.id;
    try {
      const qRes = await fetch(`${API_BASE_URL}/api/customer/requests/MATERIAL_REQUIREMENT/${matId}/quotations`, {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        }
      });
      if (qRes.ok) {
        const quotes = await qRes.json();
        req.quotations = Array.isArray(quotes) ? quotes.map(normalizeQuotationForUI) : [];
        renderSummaryMetrics();
        renderRequests();
      }
    } catch (e) {
      console.warn("Could not refresh quotations on modal open:", e);
    }
  }

  if (!req.quotations || req.quotations.length === 0) {
    showToast("No Quotations", "No quotations have been received for this request yet.");
    return;
  }

  activeRequestId = requestId;
  currentModalViewMode = "cards";

  // Set Request context titles
  const modal = document.getElementById("quotationsModal");
  document.getElementById("modalReqId").textContent = req.id;
  document.getElementById("modalReqTitle").textContent = req.title;
  document.getElementById("modalReqType").textContent = req.typeLabel;
  document.getElementById("modalReqCountBadge").textContent = `${req.quotations.length} Quotations Received`;

  // Context bar
  const contextBar = document.getElementById("modalReqContextBar");
  if (contextBar) {
    contextBar.innerHTML = `
      <div class="context-item">
        <span class="context-label">Requirement</span>
        <span class="context-val">${req.material || req.service || req.title}</span>
      </div>
      <div class="context-item">
        <span class="context-label">Quantity / Volume</span>
        <span class="context-val">${req.quantity}</span>
      </div>
      <div class="context-item">
        <span class="context-label">Location</span>
        <span class="context-val">${req.location}</span>
      </div>
      <div class="context-item">
        <span class="context-label">Date Submitted</span>
        <span class="context-val">${req.submittedDate}</span>
      </div>
    `;
  }

  // Render Quotation view
  renderQuotationsView(req);

  // Show modal
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

function closeQuotationsModal() {
  const modal = document.getElementById("quotationsModal");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }
  activeRequestId = null;
}

function switchQuotationsView(mode) {
  currentModalViewMode = mode;
  const cardsTab = document.getElementById("tabCardsView");
  const compareTab = document.getElementById("tabCompareView");

  if (cardsTab) cardsTab.classList.toggle("active", mode === "cards");
  if (compareTab) compareTab.classList.toggle("active", mode === "compare");

  const req = currentRequests.find(r => r.id === activeRequestId);
  if (req) {
    renderQuotationsView(req);
  }
}

function renderQuotationsView(req) {
  const container = document.getElementById("modalQuotationsContainer");
  if (!container) return;

  if (currentModalViewMode === "cards") {
    container.innerHTML = `
      <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; flex-wrap: wrap; gap: 8px;">
        <div style="font-size: 13px; color: #1e40af;">
          <i class="fa-solid fa-lightbulb" style="color: #2563eb; margin-right: 6px;"></i> Compare all seller offers and split quantities across multiple suppliers.
        </div>
        <button class="btn-card-action primary-subtle" onclick="switchQuotationsView('compare')" style="background: #2563eb; color: #fff; font-weight: 700; padding: 6px 14px; font-size: 12px;">
          <i class="fa-solid fa-code-compare mr-1"></i> Compare & Split Procurement / तुलना और आवंटन
        </button>
      </div>
      <div class="quotations-cards-grid">
        ${req.quotations.map(quote => createQuotationCardHTML(quote, req)).join("")}
      </div>
    `;
  } else {
    if (req.type === "MATERIAL_REQUIREMENT") {
      container.innerHTML = createMultiSellerSplitAllocationHTML(req);
    } else {
      container.innerHTML = createComparisonTableHTML(req.quotations, req);
    }
  }
}

function createQuotationCardHTML(quote, req) {
  // Provider Type Styling
  let providerClass = "seller";
  let providerIcon = "fa-store";
  if (quote.providerType === "CONTRACTOR") {
    providerClass = "contractor";
    providerIcon = "fa-helmet-safety";
  } else if (quote.providerType === "PROFESSIONAL") {
    providerClass = "professional";
    providerIcon = "fa-user-tie";
  }

  const isAccepted = quote.status.toLowerCase() === "accepted";
  const isRejected = quote.status.toLowerCase() === "rejected";
  const formattedAmount = Number(quote.quotedAmount).toLocaleString("en-IN");

  let proceedBtnClass = isAccepted ? "btn-proceed-quote is-proceeded" : "btn-proceed-quote";
  let proceedBtnLabel = isAccepted ? `<i class="fa-solid fa-check-double"></i> Proceeded` : `<i class="fa-solid fa-arrow-right"></i> Proceed`;
  if (isRejected) {
    proceedBtnClass = "btn-proceed-quote is-rejected";
    proceedBtnLabel = `<i class="fa-solid fa-ban"></i> Declined`;
  }

  return `
    <div class="quotation-card ${isAccepted ? 'is-accepted' : ''}" id="quote-card-${quote.id}">
      <!-- Top Row: Provider & Quoted Amount -->
      <div class="quote-top-row">
        <div class="provider-info-block">
          <div class="provider-avatar-circle">
            <i class="fa-solid ${providerIcon}"></i>
          </div>
          <div class="provider-details-wrap">
            <div class="provider-title-row">
              <h4 class="provider-name">${quote.providerName}</h4>
              <span class="provider-type-badge ${providerClass}">
                <i class="fa-solid ${providerIcon}"></i> ${quote.providerTypeLabel}
              </span>
              ${quote.isVerified ? '<span style="color:#0284c7; font-size:13px;" title="Verified BuildBid Provider"><i class="fa-solid fa-circle-check"></i></span>' : ''}
            </div>
            <div class="provider-meta-row">
              <span class="rating-star-span">
                <i class="fa-solid fa-star"></i> ${quote.rating} (${quote.reviewsCount} reviews)
              </span>
              <span>•</span>
              <span><i class="fa-solid fa-location-dot"></i> ${quote.location}</span>
            </div>
          </div>
        </div>

        <div class="quote-price-block">
          <span class="quote-price-label">Quoted Amount</span>
          <div class="quote-price-amount">₹${formattedAmount}</div>
          <span class="quote-submitted-time"><i class="fa-regular fa-clock"></i> Submitted ${quote.submittedAgo}</span>
        </div>
      </div>

      <!-- Key Metrics Row: Timeline, Warranty, Payment, Validity -->
      <div class="quote-metrics-bar">
        <div class="q-metric-col">
          <span class="q-metric-label"><i class="fa-regular fa-calendar-check"></i> Timeline / Delivery</span>
          <span class="q-metric-val">${quote.timeline}</span>
        </div>
        <div class="q-metric-col">
          <span class="q-metric-label"><i class="fa-solid fa-shield-halved"></i> Warranty</span>
          <span class="q-metric-val">${quote.warranty || "—"}</span>
        </div>
        <div class="q-metric-col">
          <span class="q-metric-label"><i class="fa-solid fa-hourglass-start"></i> Validity</span>
          <span class="q-metric-val">${quote.validity}</span>
        </div>
        <div class="q-metric-col">
          <span class="q-metric-label"><i class="fa-regular fa-credit-card"></i> Payment Terms</span>
          <span class="q-metric-val">${quote.paymentTerms}</span>
        </div>
      </div>

      <!-- Actions Row -->
      <div class="quote-actions-row">
        <div class="quote-actions-left">
          <button class="btn-card-action" onclick="openQuotationDetailSheet('${req.id}', '${quote.id}')">
            <i class="fa-solid fa-file-invoice"></i> View Quotation
          </button>
          <button class="btn-card-action" onclick="openContactProviderModal('${quote.providerName}', '${quote.providerTypeLabel}', '${quote.phone}', '${quote.email}')">
            <i class="fa-solid fa-comment-dots"></i> Contact Provider
          </button>
        </div>

        <div class="quote-actions-right">
          <button class="btn-card-action text-red" onclick="handleRejectQuotation('${req.id}', '${quote.id}')" ${(isAccepted || isRejected) ? 'disabled style="display:none;"' : ''}>
            <i class="fa-solid fa-xmark"></i> Reject
          </button>
          <button class="${proceedBtnClass}" onclick="openProceedConfirmModal('${req.id}', '${quote.id}')" ${(isAccepted || isRejected) ? 'disabled' : ''}>
            ${proceedBtnLabel}
          </button>
        </div>
      </div>
    </div>
  `;
}

/* =========================================================
   8. QUOTATION COMPARISON TABLE (SECTION 15)
   ========================================================= */
function createComparisonTableHTML(quotations, req) {
  return `
    <div class="comparison-table-wrapper">
      <table class="comparison-table">
        <thead>
          <tr>
            <th>Provider</th>
            <th>Type</th>
            <th>Quoted Total</th>
            <th>Timeline</th>
            <th>Warranty</th>
            <th>Payment Terms</th>
            <th>Status</th>
            <th style="text-align: right;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${quotations.map(quote => {
            const formattedAmount = Number(quote.quotedAmount).toLocaleString("en-IN");
            const isAccepted = quote.status.toLowerCase() === "accepted";
            const isRejected = quote.status.toLowerCase() === "rejected";
            let typeBadgeClass = quote.providerType === "MATERIAL_SELLER" ? "seller" : (quote.providerType === "CONTRACTOR" ? "contractor" : "professional");
            let statusBadgeClass = isAccepted ? 'accepted' : (isRejected ? 'rejected' : 'pending');
            
            return `
              <tr>
                <td>
                  <strong>${quote.providerName}</strong><br>
                  <small style="color: #64748b;"><i class="fa-solid fa-star" style="color: #eab308;"></i> ${quote.rating} · ${quote.location}</small>
                </td>
                <td>
                  <span class="provider-type-badge ${typeBadgeClass}">${quote.providerTypeLabel}</span>
                </td>
                <td>
                  <span class="comparison-total-price">₹${formattedAmount}</span>
                </td>
                <td>${quote.timeline}</td>
                <td>${quote.warranty || "—"}</td>
                <td style="max-width: 180px; font-size: 12px; color: #475569;">${quote.paymentTerms}</td>
                <td>
                  <span class="status-badge ${statusBadgeClass}">${quote.status}</span>
                </td>
                <td style="text-align: right; white-space: nowrap;">
                  <button class="btn-card-action" style="padding: 6px 10px; margin-right: 6px;" onclick="openQuotationDetailSheet('${req.id}', '${quote.id}')">
                    <i class="fa-solid fa-eye"></i> Details
                  </button>
                  <button class="btn-proceed-quote" style="padding: 6px 12px; font-size: 12px;" onclick="openProceedConfirmModal('${req.id}', '${quote.id}')" ${(isAccepted || isRejected) ? 'disabled' : ''}>
                    ${isAccepted ? 'Proceeded' : (isRejected ? 'Declined' : 'Proceed')}
                  </button>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

/* =========================================================
   9. DETAILED QUOTATION SHEET (SECTION 14)
   ========================================================= */
function openQuotationDetailSheet(requestId, quoteId) {
  const req = currentRequests.find(r => r.id === requestId);
  if (!req) return;
  const quote = req.quotations.find(q => q.id === quoteId);
  if (!quote) return;

  activeQuotationId = quoteId;

  document.getElementById("sheetQuoteId").textContent = quote.id;
  document.getElementById("sheetProviderName").textContent = quote.providerName;
  document.getElementById("sheetProviderRole").textContent = quote.providerTypeLabel;

  const content = document.getElementById("quotationSheetContent");
  if (!content) return;

  const formattedTotal = Number(quote.quotedAmount).toLocaleString("en-IN");
  const isAccepted = quote.status.toLowerCase() === "accepted";

  // Itemized breakdown table
  const items = quote.costBreakdown?.items || [];
  const itemsRows = items.map(it => `
    <tr>
      <td>${it.name}</td>
      <td>${it.qty}</td>
      <td>₹${Number(it.rate).toLocaleString("en-IN")}</td>
      <td style="font-weight: 700;">₹${Number(it.amount).toLocaleString("en-IN")}</td>
    </tr>
  `).join("");

  // Inclusions & Exclusions
  const inclusions = quote.terms?.included || [];
  const exclusions = quote.terms?.excluded || [];

  content.innerHTML = `
    <div class="quotation-sheet-wrapper">
      <!-- Provider Header Card -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div>
          <h4 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">${quote.providerName}</h4>
          <p style="font-size: 13px; color: #64748b; margin: 0;">
            <i class="fa-solid fa-location-dot"></i> ${quote.location} • <i class="fa-solid fa-phone"></i> ${quote.phone} • <i class="fa-solid fa-envelope"></i> ${quote.email}
          </p>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Total Quoted Price</span>
          <div style="font-size: 24px; font-weight: 800; color: #0284c7;">₹${formattedTotal}</div>
        </div>
      </div>

      <!-- Financial Cost Breakdown Table -->
      <div>
        <h5 class="sheet-section-title"><i class="fa-solid fa-receipt"></i> Detailed Financial Breakdown</h5>
        <table class="sheet-breakdown-table">
          <thead>
            <tr>
              <th>Description / Item</th>
              <th>Quantity / Scope</th>
              <th>Unit Rate</th>
              <th>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
            ${quote.costBreakdown?.labour ? `<tr><td colspan="3">Labour & Offloading Charges</td><td style="font-weight: 700;">₹${Number(quote.costBreakdown.labour).toLocaleString("en-IN")}</td></tr>` : ''}
            ${quote.costBreakdown?.freight ? `<tr><td colspan="3">Transportation & Logistics Freight</td><td style="font-weight: 700;">₹${Number(quote.costBreakdown.freight).toLocaleString("en-IN")}</td></tr>` : ''}
            ${quote.costBreakdown?.taxes ? `<tr><td colspan="3">Taxes & GST (18%)</td><td style="font-weight: 700;">₹${Number(quote.costBreakdown.taxes).toLocaleString("en-IN")}</td></tr>` : ''}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3">Final Total Quoted Amount:</td>
              <td style="color: #0284c7; font-size: 16px;">₹${formattedTotal}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Timeline & Terms -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px;">
        <div>
          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Execution Timeline</span>
          <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-top: 2px;">${quote.timeline}</div>
        </div>
        <div>
          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Quotation Validity</span>
          <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-top: 2px;">${quote.validity}</div>
        </div>
        <div>
          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Warranty Period</span>
          <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-top: 2px;">${quote.warranty || "Standard Statutory"}</div>
        </div>
        <div>
          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Payment Terms</span>
          <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-top: 2px;">${quote.paymentTerms}</div>
        </div>
      </div>

      <!-- Included & Excluded Checklist -->
      <div class="terms-checklist-grid">
        <div class="terms-box">
          <h5><i class="fa-solid fa-circle-check" style="color: #10b981;"></i> What is Included</h5>
          <ul>
            ${inclusions.map(inc => `<li><i class="fa-solid fa-check"></i> <span>${inc}</span></li>`).join("")}
          </ul>
        </div>
        <div class="terms-box">
          <h5><i class="fa-solid fa-circle-xmark" style="color: #ef4444;"></i> What is Excluded</h5>
          <ul>
            ${exclusions.map(exc => `<li><i class="fa-solid fa-xmark"></i> <span>${exc}</span></li>`).join("")}
          </ul>
        </div>
      </div>

      <!-- Provider Remarks Note -->
      ${quote.message ? `
        <div class="provider-note-box">
          <strong><i class="fa-solid fa-quote-left"></i> Note from Provider:</strong> ${quote.message}
        </div>
      ` : ''}

      <!-- Bottom Actions -->
      <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 10px; border-top: 1px solid #f1f5f9; padding-top: 18px;">
        <button class="btn-card-action" onclick="closeQuotationDetailSheet()">
          Close
        </button>
        <button class="btn-card-action" onclick="openContactProviderModal('${quote.providerName}', '${quote.providerTypeLabel}', '${quote.phone}', '${quote.email}')">
          <i class="fa-solid fa-comment-dots"></i> Contact Provider
        </button>
        <button class="btn-proceed-quote" onclick="closeQuotationDetailSheet(); openProceedConfirmModal('${req.id}', '${quote.id}')" ${(isAccepted || isRejected) ? 'disabled' : ''}>
          ${isAccepted ? 'Proceeded' : (isRejected ? 'Declined' : '<i class="fa-solid fa-arrow-right"></i> Proceed with this Quotation')}
        </button>
      </div>
    </div>
  `;

  const sheetModal = document.getElementById("quotationDetailModal");
  if (sheetModal) {
    sheetModal.classList.add("active");
  }
}

function closeQuotationDetailSheet() {
  const sheetModal = document.getElementById("quotationDetailModal");
  if (sheetModal) {
    sheetModal.classList.remove("active");
  }
  activeQuotationId = null;
}

/* =========================================================
   10. PROCEED CONFIRMATION FLOW (SECTION 17)
   ========================================================= */
function openProceedConfirmModal(requestId, quoteId) {
  const req = currentRequests.find(r => r.id === requestId);
  if (!req) return;
  const quote = req.quotations.find(q => q.id === quoteId);
  if (!quote) return;

  activeRequestId = requestId;
  activeQuotationId = quoteId;

  document.getElementById("confirmProviderName").textContent = quote.providerName;
  document.getElementById("confirmProviderType").textContent = quote.providerTypeLabel;
  document.getElementById("confirmQuotedAmount").textContent = `₹${Number(quote.quotedAmount).toLocaleString("en-IN")}`;
  document.getElementById("confirmRequestTitle").textContent = req.title;

  const modal = document.getElementById("proceedConfirmModal");
  if (modal) {
    modal.classList.add("active");
  }
}

function closeProceedConfirmModal() {
  const modal = document.getElementById("proceedConfirmModal");
  if (modal) {
    modal.classList.remove("active");
  }
}

async function confirmProceedAction() {
  const req = currentRequests.find(r => r.id === activeRequestId);
  if (!req) return;
  const quote = req.quotations.find(q => q.id === activeQuotationId);
  if (!quote) return;

  const proceedBtn = document.getElementById("confirmProceedBtn") || document.querySelector("#proceedConfirmModal .btn-primary");
  if (proceedBtn) {
    proceedBtn.disabled = true;
    proceedBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Processing...';
  }

  const token = getCleanToken();
  if (token) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/quotations/${encodeURIComponent(quote.backendId || quote.id)}/accept`, {
        method: "PUT",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        closeProceedConfirmModal();
        await loadCustomerRequests();
        const updatedReq = currentRequests.find(r => r.id === activeRequestId);
        if (updatedReq && document.getElementById("quotationsModal")?.classList.contains("active")) {
          renderQuotationsView(updatedReq);
        }
        showToast(
          "Quotation Accepted!",
          `You have accepted the quotation from ${quote.providerName} for ₹${Number(quote.quotedAmount).toLocaleString("en-IN")}.`
        );
        return;
      } else {
        showToast("Action Failed", data.error || "Failed to accept quotation.");
        return;
      }
    } catch (err) {
      console.error("Accept quotation error:", err);
      showToast("Network Error", "Unable to reach server to accept quotation.");
      return;
    } finally {
      if (proceedBtn) {
        proceedBtn.disabled = false;
        proceedBtn.innerHTML = '<i class="fa-solid fa-check"></i> Confirm & Proceed';
      }
    }
  }

  // Fallback for unauthenticated preview mode
  quote.status = "Accepted";
  req.status = "Accepted";
  closeProceedConfirmModal();
  renderSummaryMetrics();
  renderRequests();
  if (document.getElementById("quotationsModal")?.classList.contains("active")) {
    renderQuotationsView(req);
  }
  showToast(
    "Quotation Proceeded!",
    `You have chosen to proceed with ${quote.providerName} for ₹${Number(quote.quotedAmount).toLocaleString("en-IN")}.`
  );
}

/* =========================================================
   11. ORIGINAL REQUEST DETAILS MODAL
   ========================================================= */
function openRequestDetailsModal(requestId) {
  const req = currentRequests.find(r => r.id === requestId);
  if (!req) return;

  document.getElementById("detailModalId").textContent = req.id;
  document.getElementById("detailModalTitle").textContent = req.title;
  document.getElementById("detailModalType").textContent = req.typeLabel;

  const body = document.getElementById("requestDetailsModalBody");
  if (!body) return;

  const isDirectBuy = (req.type === "DIRECT_BUY" || req.isDirectBuy === true);
  const isDirectHire = (req.type === "DIRECT_HIRE");
  const rawStatus = (req.rawStatus || req.status || "").toUpperCase();
  const quoteCount = req.quotations ? req.quotations.length : 0;
  const isAccepted = isDirectBuy && (!rawStatus.includes("WAITING_FOR_ACCEPTANCE") && !rawStatus.includes("NEW") && !rawStatus.includes("PENDING"));
  const isProAccepted = isDirectHire && (rawStatus.includes("ACCEPTED") || rawStatus.includes("IN_PROGRESS") || rawStatus.includes("CONTACTED"));

  body.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 18px;">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px;">
        <div>
          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Status</span>
          <div style="font-size: 14px; font-weight: 800; color: #1e293b; margin-top: 2px;">${escapeHtml(req.status)}</div>
        </div>
        <div>
          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Category / Service</span>
          <div style="font-size: 14px; font-weight: 800; color: #1e293b; margin-top: 2px;">${escapeHtml(req.material || req.service || req.category)}</div>
        </div>
        <div>
          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Quantity / Volume</span>
          <div style="font-size: 14px; font-weight: 800; color: #0284c7; margin-top: 2px;">${escapeHtml(String(req.quantity))}</div>
        </div>
        <div>
          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">${isDirectBuy ? 'Direct Purchase Status' : (isDirectHire ? 'Hiring Status' : 'Quotations Received')}</span>
          <div style="font-size: 14px; font-weight: 800; color: ${(isDirectBuy || isDirectHire) ? '#0284c7' : '#10b981'}; margin-top: 2px;">${(isDirectBuy || isDirectHire) ? escapeHtml(req.status) : (quoteCount + ' Received')}</div>
        </div>
      </div>

      ${isDirectBuy ? (isAccepted ? `
      <!-- Accepted Seller Contact Details -->
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 20px;">
        <h5 style="font-size: 13.5px; font-weight: 800; color: #166534; margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-store" style="color: #15803d;"></i> Accepted Seller & Contact Information
        </h5>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; font-size: 13px; color: #1e293b;">
          <div>
            <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Seller / Business Name</span>
            <div style="font-weight: 700; color: #0f172a; margin-top: 2px;">${escapeHtml(req.sellerBusinessName || req.sellerName || req.targetProvider || 'Verified Seller')}</div>
          </div>
          <div>
            <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Seller ID</span>
            <div style="font-weight: 700; color: #0f172a; margin-top: 2px;">#${escapeHtml(String(req.sellerId || req.backendId || '-'))}</div>
          </div>
          <div>
            <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Contact Number</span>
            <div style="font-weight: 700; color: #0f172a; margin-top: 2px;">${req.sellerPhone ? `<i class="fa-solid fa-phone" style="color: #10b981; margin-right: 4px;"></i> ${escapeHtml(req.sellerPhone)}` : '-'}</div>
          </div>
          <div>
            <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Email Address</span>
            <div style="font-weight: 700; color: #0f172a; margin-top: 2px;">${req.sellerEmail ? `<i class="fa-solid fa-envelope" style="color: #0284c7; margin-right: 4px;"></i> ${escapeHtml(req.sellerEmail)}` : '-'}</div>
          </div>
          <div style="grid-column: 1 / -1;">
            <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Registered / Business Location</span>
            <div style="font-weight: 600; color: #334155; margin-top: 2px;"><i class="fa-solid fa-location-dot" style="color: #ef4444; margin-right: 4px;"></i> ${escapeHtml(req.sellerAddress || req.sellerLocation || 'Regional Seller Hub')}</div>
          </div>
        </div>
      </div>

      <!-- Expected Delivery Details -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px;">
        <h5 style="font-size: 13.5px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-truck-ramp-box" style="color: #0284c7;"></i> Expected Delivery & Fulfillment
        </h5>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; font-size: 13px; color: #1e293b;">
          <div>
            <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Expected Delivery Date</span>
            <div style="font-weight: 700; color: #0284c7; margin-top: 2px;">${escapeHtml(req.expectedDeliveryDate || 'Standard Delivery Window')}</div>
          </div>
          <div>
            <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Fulfillment Status</span>
            <div style="font-weight: 700; color: #059669; margin-top: 2px;">${escapeHtml(req.status)}</div>
          </div>
          <div style="grid-column: 1 / -1;">
            <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Delivery Site Location</span>
            <div style="font-weight: 600; color: #334155; margin-top: 2px;"><i class="fa-solid fa-location-dot" style="color: #ef4444; margin-right: 4px;"></i> ${escapeHtml(req.deliverySite || req.location)}</div>
          </div>
        </div>
      </div>
      ` : `
      <!-- Waiting for Seller Acceptance Notice -->
      <div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 12px; padding: 14px 18px; font-size: 13px; color: #854d0e;">
        <span style="font-weight: 700;"><i class="fa-solid fa-hourglass-half"></i> Waiting for Seller Acceptance:</span>
        Your direct material purchase order has been placed with <strong>${escapeHtml(req.sellerName || req.targetProvider || 'Verified Seller')}</strong>. Complete seller contact credentials and expected delivery updates will be revealed once the order is accepted.
      </div>
      `) : ''}

      ${isDirectHire ? (isProAccepted ? `
      <!-- Accepted Professional Information -->
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 20px;">
        <h5 style="font-size: 13.5px; font-weight: 800; color: #166534; margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-user-check" style="color: #15803d;"></i> Assigned Professional & Engagement Details
        </h5>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; font-size: 13px; color: #1e293b;">
          <div>
            <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Assigned Professional</span>
            <div style="font-weight: 700; color: #0f172a; margin-top: 2px;">${escapeHtml(req.targetProvider || 'Verified Professional')}</div>
          </div>
          <div>
            <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Engagement Status</span>
            <div style="font-weight: 700; color: #16a34a; margin-top: 2px;">Accepted / स्वीकार किया गया</div>
          </div>
        </div>
      </div>
      ` : `
      <!-- Waiting for Professional Acceptance Notice -->
      <div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 12px; padding: 14px 18px; font-size: 13px; color: #854d0e;">
        <span style="font-weight: 700;"><i class="fa-solid fa-hourglass-half"></i> Waiting for Professional Acceptance:</span>
        Your direct hire service request has been sent to <strong>${escapeHtml(req.targetProvider || 'Verified Professional')}</strong> and is awaiting acceptance.
      </div>
      `) : ''}

      ${req.estimatedTotal ? `
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px 16px; font-size: 13.5px; color: #166534;">
        <span style="font-weight: 700;"><i class="fa-solid fa-receipt"></i> Direct Purchase Pricing:</span> Item Price: ₹${Number(req.materialPrice || req.materialAmount || 0).toLocaleString("en-IN")} • Freight: ₹${Number(req.transportationCost || 0).toLocaleString("en-IN")} • <strong>Total: ₹${Number(req.estimatedTotal).toLocaleString("en-IN")}</strong>
        ${req.verificationCode ? `<br><small style="color: #15803d; font-weight: 600;">Verification Code: ${escapeHtml(req.verificationCode)}</small>` : ''}
      </div>
      ` : ''}

      <div>
        <h5 style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">Site Address & Location</h5>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; font-size: 13.5px; color: #334155;">
          <i class="fa-solid fa-location-dot" style="color: #ef4444; margin-right: 6px;"></i> ${escapeHtml(req.location)}
          ${req.deliverySite ? `<br><small style="color: #64748b; margin-left: 20px;">Offloading Area: ${escapeHtml(req.deliverySite)}</small>` : ''}
        </div>
      </div>

      <div>
        <h5 style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">Detailed Specifications & Notes</h5>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; font-size: 13.5px; color: #334155; line-height: 1.6;">
          ${escapeHtml(req.description)}
        </div>
      </div>

      <div style="font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px;">
        <i class="fa-regular fa-clock"></i> Submitted on: ${escapeHtml(req.submittedDate)} • Reference ID: <strong>${escapeHtml(req.id)}</strong>
      </div>
    </div>
  `;

  const modal = document.getElementById("requestDetailModal");
  if (modal) {
    modal.classList.add("active");
  }
}

function closeRequestDetailsModal() {
  const modal = document.getElementById("requestDetailModal");
  if (modal) {
    modal.classList.remove("active");
  }
}

/* =========================================================
   12. CONTACT PROVIDER MODAL
   ========================================================= */
function openContactProviderModal(name, role, phone, email) {
  document.getElementById("contactModalProviderName").textContent = name;
  document.getElementById("contactModalProviderRole").textContent = role;
  document.getElementById("contactModalPhone").textContent = phone || "+91 98765 43210";
  document.getElementById("contactModalEmail").textContent = email || "contact@buildbid-provider.com";

  const modal = document.getElementById("contactProviderModal");
  if (modal) {
    modal.classList.add("active");
  }
}

function closeContactProviderModal() {
  const modal = document.getElementById("contactProviderModal");
  if (modal) {
    modal.classList.remove("active");
  }
}

function handleSendMessage(e) {
  e.preventDefault();
  const input = document.getElementById("contactMessageInput");
  const msg = input ? input.value.trim() : "";
  if (!msg) return;

  closeContactProviderModal();
  if (input) input.value = "";
  showToast("Message Sent!", "Your message has been dispatched to the provider.");
}

/* =========================================================
   13. REQUEST EDIT & CANCEL FLOWS
   ========================================================= */
function handleEditRequest(requestId) {
  const req = currentRequests.find(r => r.id === requestId);
  if (!req) return;

  if (req.type === "DIRECT_BUY") {
    showToast("Edit Request", "Direct material purchase requests can be modified from the buy materials page.", "info");
  } else if (req.type === "MATERIAL_REQUIREMENT") {
    showToast("Edit Requirement", "Material requirement details can be edited before provider quotations are accepted.", "info");
  } else {
    showToast("Edit Request", `Request #${requestId} opened for updates.`, "info");
  }
}

function handleCancelRequestPrompt(requestId) {
  const req = currentRequests.find(r => r.id === requestId);
  if (!req) return;

  if (confirm(`Are you sure you want to cancel request #${requestId} (${req.title})?`)) {
    req.status = "Cancelled";
    renderSummaryMetrics();
    renderRequests();
    showToast("Request Cancelled", `Request #${requestId} has been marked as cancelled.`);
  }
}

async function handleRejectQuotation(requestId, quoteId) {
  const req = currentRequests.find(r => r.id === requestId);
  if (!req) return;
  const quote = req.quotations.find(q => q.id === quoteId);
  if (!quote) return;

  if (confirm(`Are you sure you want to reject the quotation from ${quote.providerName}?`)) {
    const token = getCleanToken();
    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/quotations/${encodeURIComponent(quote.backendId || quote.id)}/reject`, {
          method: "PUT",
          headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
          }
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          await loadCustomerRequests();
          const updatedReq = currentRequests.find(r => r.id === requestId);
          if (updatedReq && document.getElementById("quotationsModal")?.classList.contains("active")) {
            renderQuotationsView(updatedReq);
          }
          showToast("Quotation Rejected", `The quotation from ${quote.providerName} has been declined.`);
          return;
        } else {
          showToast("Action Failed", data.error || "Failed to reject quotation.");
          return;
        }
      } catch (err) {
        console.error("Reject quotation error:", err);
        showToast("Network Error", "Unable to reach server to reject quotation.");
        return;
      }
    }

    // Fallback for unauthenticated preview mode
    quote.status = "Rejected";
    renderQuotationsView(req);
    showToast("Quotation Rejected", `The quotation from ${quote.providerName} has been declined.`);
  }
}

/* =========================================================
   14. KEYBOARD ESCAPE & MODAL OVERLAY HANDLERS
   ========================================================= */
function setupModalKeyboardHandlers() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeQuotationsModal();
      closeQuotationDetailSheet();
      closeProceedConfirmModal();
      closeRequestDetailsModal();
      closeContactProviderModal();
    }
  });

  // Click outside dialog to close
  document.querySelectorAll(".modal-backdrop-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("active");
        document.body.style.overflow = "";
      }
    });
  });
}

/* =========================================================
   15. TOAST NOTIFICATION UTILITY
   ========================================================= */
function showToast(title, message, type = "success") {
  const toast = document.getElementById("globalToast");
  const titleEl = document.getElementById("toastTitle");
  const msgEl = document.getElementById("toastMessage");
  const iconEl = document.getElementById("toastIcon");

  if (!toast || !titleEl || !msgEl) return;

  titleEl.textContent = title;
  msgEl.textContent = message;

  if (iconEl) {
    if (type === "info") {
      iconEl.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
      iconEl.style.background = '#e0f2fe';
      iconEl.style.color = '#0284c7';
    } else {
      iconEl.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
      iconEl.style.background = '#ecfdf5';
      iconEl.style.color = '#10b981';
    }
  }

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}


/* =========================================================
   POST MATERIAL REQUIREMENT: MULTI-SELLER SPLIT ALLOCATION
   (SECTIONS 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 19, 20)
   ========================================================= */

window.activeSplitAllocations = window.activeSplitAllocations || {};

function escapeId(str) {
  return String(str || "").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function escapeJs(str) {
  return String(str || "").replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function getRequirementItemsForSplit(req) {
  if (req.items && Array.isArray(req.items) && req.items.length > 0) {
    return req.items.map((it, idx) => ({
      id: it.id || `item-${idx}`,
      materialName: it.materialName || it.name || "Material Item",
      quantity: Number(it.quantity) || 1,
      unit: it.unit || "Units",
      category: it.category || ""
    }));
  }
  
  // Synthesize from material & quantity fields
  let qtyNum = 100;
  let unitStr = "Units";
  const m = (req.quantity || "").match(/([\d\.,]+)\s*([a-zA-Z]+)/);
  if (m) {
    qtyNum = parseFloat(m[1].replace(/,/g, "")) || 100;
    unitStr = m[2] || "Units";
  }
  return [
    {
      id: "item-0",
      materialName: req.material || req.title || "Required Material",
      quantity: qtyNum,
      unit: unitStr,
      category: req.category || ""
    }
  ];
}

function renderItemAllocationStatus(item, sumAllocated) {
  const reqQty = item.quantity;
  if (sumAllocated > reqQty) {
    return `
      <span class="status-badge rejected" style="font-size: 12px; padding: 4px 10px;">
        <i class="fa-solid fa-triangle-exclamation"></i> Over-allocated (${sumAllocated} / ${reqQty} ${item.unit})
      </span>
    `;
  } else if (sumAllocated === reqQty) {
    return `
      <span class="status-badge accepted" style="font-size: 12px; padding: 4px 10px; background: #ecfdf5; color: #047857; border-color: #a7f3d0;">
        <i class="fa-solid fa-circle-check"></i> 100% Fully Allocated (${sumAllocated} ${item.unit})
      </span>
    `;
  } else if (sumAllocated > 0) {
    const remaining = reqQty - sumAllocated;
    return `
      <span class="status-badge pending" style="font-size: 12px; padding: 4px 10px; background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe;">
        <i class="fa-solid fa-clock-rotate-left"></i> Partial: ${sumAllocated} / ${reqQty} ${item.unit} (${remaining} remaining)
      </span>
    `;
  } else {
    return `
      <span class="status-badge pending" style="font-size: 12px; padding: 4px 10px; background: #fef2f2; color: #b91c1c; border-color: #fecaca;">
        <i class="fa-solid fa-circle-exclamation"></i> Unallocated (0 / ${reqQty} ${item.unit})
      </span>
    `;
  }
}

function createMultiSellerSplitAllocationHTML(req) {
  const reqItems = getRequirementItemsForSplit(req);
  const quotations = req.quotations || [];
  
  if (!window.activeSplitAllocations[req.id]) {
    window.activeSplitAllocations[req.id] = {};
  }
  const currentAlloc = window.activeSplitAllocations[req.id];

  let hasOverAllocation = false;
  let totalAllocatedItems = 0;

  const itemCardsHTML = reqItems.map((item, itemIdx) => {
    if (!currentAlloc[item.materialName]) {
      currentAlloc[item.materialName] = {};
    }
    const itemAlloc = currentAlloc[item.materialName];

    let sumAllocated = 0;

    // Filter quotations that quoted this material
    const quotingSellers = quotations.filter(q => {
      if (!q.items || q.items.length === 0) return true; // generic quote applies to single req
      return q.items.some(qi => {
        const qiName = (qi.materialName || qi.name || "").toLowerCase();
        const itName = item.materialName.toLowerCase();
        return qiName.includes(itName) || itName.includes(qiName);
      });
    });

    const sellerRowsHTML = quotingSellers.map(q => {
      // Find matching item quote
      let quotedItem = null;
      if (q.items && q.items.length > 0) {
        quotedItem = q.items.find(qi => {
          const qiName = (qi.materialName || qi.name || "").toLowerCase();
          const itName = item.materialName.toLowerCase();
          return qiName.includes(itName) || itName.includes(qiName);
        }) || q.items[0];
      }

      const unitRate = quotedItem ? (quotedItem.unitPrice || quotedItem.rate || 0) : (q.quotedAmount / (item.quantity || 1));
      let availableQty = quotedItem ? (quotedItem.availableQuantity || quotedItem.quantity || item.quantity) : item.quantity;
      if (typeof availableQty === "string") {
        availableQty = parseFloat(availableQty.replace(/[^0-9.]/g, "")) || item.quantity;
      }

      const allocatedQty = Number(itemAlloc[q.id]) || 0;
      sumAllocated += allocatedQty;
      if (allocatedQty > 0) totalAllocatedItems++;

      const lineTotal = allocatedQty * unitRate;

      return `
        <tr>
          <td>
            <strong>${q.providerName}</strong>
            <span class="provider-type-badge seller" style="font-size: 10px; padding: 2px 6px; margin-left: 4px;">Seller</span>
            <br><small style="color: #64748b;"><i class="fa-solid fa-star" style="color: #eab308;"></i> ${q.rating} · ${q.location}</small>
          </td>
          <td>
            <span style="font-weight: 700; color: #0f172a;">${Number(availableQty).toLocaleString('en-IN')} ${item.unit}</span>
          </td>
          <td>
            <span style="font-weight: 700; color: #0284c7;">₹${Number(unitRate).toLocaleString('en-IN')}</span> / ${item.unit}
          </td>
          <td>${q.timeline}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 6px;">
              <input type="number" min="0" max="${availableQty}" step="any"
                class="split-qty-input"
                id="split_in_${escapeId(req.id)}_${escapeId(item.materialName)}_${escapeId(q.id)}"
                value="${allocatedQty}"
                oninput="handleSplitQtyChange('${req.id}', '${escapeJs(item.materialName)}', '${q.id}', this.value)"
                style="width: 85px; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 700; text-align: right;"
              >
              <span style="font-size: 12px; color: #64748b;">${item.unit}</span>
              <button type="button" class="btn-card-action" style="padding: 4px 8px; font-size: 11px;"
                onclick="handleSplitMaxClick('${req.id}', '${escapeJs(item.materialName)}', '${q.id}', ${availableQty}, ${item.quantity})">
                Max / अधिकतम
              </button>
            </div>
          </td>
          <td style="text-align: right; font-weight: 700; color: #0f172a;">
            ₹${Number(lineTotal).toLocaleString('en-IN')}
          </td>
        </tr>
      `;
    }).join("");

    if (sumAllocated > item.quantity) {
      hasOverAllocation = true;
    }

    return `
      <div class="split-matrix-card" style="margin-bottom: 20px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
          <div>
            <h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0;">
              <i class="fa-solid fa-cube text-blue-600" style="color: #0284c7; margin-right: 6px;"></i> ${item.materialName}
            </h4>
            <span style="font-size: 13px; color: #64748b;">
              Required Quantity / आवश्यक मात्रा: <strong style="color: #0f172a;">${Number(item.quantity).toLocaleString('en-IN')} ${item.unit}</strong>
            </span>
          </div>
          <div>
            ${renderItemAllocationStatus(item, sumAllocated)}
          </div>
        </div>

        <div class="comparison-table-wrapper" style="margin-bottom: 8px;">
          <table class="split-sellers-table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; font-size: 12px; color: #64748b;">
                <th style="padding: 8px;">Seller / विक्रेता</th>
                <th style="padding: 8px;">Available / उपलब्ध</th>
                <th style="padding: 8px;">Unit Price / दर</th>
                <th style="padding: 8px;">Delivery / डिलीवरी</th>
                <th style="padding: 8px; min-width: 180px;">Allocate Quantity / चयनित मात्रा</th>
                <th style="padding: 8px; text-align: right;">Line Total</th>
              </tr>
            </thead>
            <tbody>
              ${sellerRowsHTML}
            </tbody>
          </table>
        </div>

        ${sumAllocated > item.quantity ? `
          <div class="split-error-alert" style="margin-top: 10px; padding: 10px 14px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #dc2626; font-size: 13px;">
            <i class="fa-solid fa-triangle-exclamation mr-1"></i>
            <strong>Over-allocation error:</strong> Total allocated quantity (${sumAllocated} ${item.unit}) exceeds requirement of ${item.quantity} ${item.unit}. Please reduce quantity. / आवंटित मात्रा आवश्यकता से अधिक है!
          </div>
        ` : ''}
      </div>
    `;
  }).join("");

  // Review panel grouped by seller
  const sellerGroups = {};
  let grandTotal = 0;

  quotations.forEach(q => {
    const allocatedLines = [];
    let sellerSubtotal = 0;

    reqItems.forEach(it => {
      const itAlloc = currentAlloc[it.materialName] || {};
      const qty = Number(itAlloc[q.id]) || 0;
      if (qty > 0) {
        let quotedItem = null;
        if (q.items && q.items.length > 0) {
          quotedItem = q.items.find(qi => {
            const qiName = (qi.materialName || qi.name || "").toLowerCase();
            const itName = it.materialName.toLowerCase();
            return qiName.includes(itName) || itName.includes(qiName);
          }) || q.items[0];
        }
        const unitRate = quotedItem ? (quotedItem.unitPrice || quotedItem.rate || 0) : (q.quotedAmount / (it.quantity || 1));
        const lineTot = qty * unitRate;
        sellerSubtotal += lineTot;
        allocatedLines.push({
          materialName: it.materialName,
          quantity: qty,
          unit: it.unit,
          unitPrice: unitRate,
          lineTotal: lineTot
        });
      }
    });

    if (allocatedLines.length > 0) {
      const freight = (allocatedLines.length === (q.items?.length || 1)) ? (q.costBreakdown?.freight || 0) : Math.round((q.costBreakdown?.freight || 0) * (allocatedLines.length / (q.items?.length || 1)));
      const tax = Math.round((sellerSubtotal + freight) * 0.05); // standard 5% GST for materials
      const sellerTotal = sellerSubtotal + freight + tax;
      grandTotal += sellerTotal;

      sellerGroups[q.id] = {
        quote: q,
        lines: allocatedLines,
        subtotal: sellerSubtotal,
        freight: freight,
        tax: tax,
        total: sellerTotal
      };
    }
  });

  const sellerGroupsCount = Object.keys(sellerGroups).length;
  const canConfirm = !hasOverAllocation && sellerGroupsCount > 0;

  const sellerGroupsHTML = Object.values(sellerGroups).map(sg => `
    <div style="background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 10px;">
        <div>
          <h5 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0;">
            <i class="fa-solid fa-store" style="color: #64748b; margin-right: 6px;"></i> ${sg.quote.providerName}
          </h5>
          <span style="font-size: 12px; color: #64748b;">${sg.quote.location} • Delivery: ${sg.quote.timeline}</span>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">Seller Order Subtotal</span>
          <div style="font-size: 16px; font-weight: 800; color: #0284c7;">₹${Number(sg.total).toLocaleString('en-IN')}</div>
        </div>
      </div>
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tbody>
          ${sg.lines.map(l => `
            <tr>
              <td style="padding: 4px 0; color: #334155;"><strong>${l.materialName}</strong></td>
              <td style="padding: 4px 0; color: #64748b; text-align: center;">${l.quantity} ${l.unit} @ ₹${Number(l.unitPrice).toLocaleString('en-IN')}</td>
              <td style="padding: 4px 0; font-weight: 700; color: #0f172a; text-align: right;">₹${Number(l.lineTotal).toLocaleString('en-IN')}</td>
            </tr>
          `).join("")}
          ${sg.freight > 0 ? `
            <tr style="color: #64748b; font-size: 12px;">
              <td colspan="2" style="padding: 4px 0;">Delivery & Transport Freight</td>
              <td style="padding: 4px 0; font-weight: 600; text-align: right;">₹${Number(sg.freight).toLocaleString('en-IN')}</td>
            </tr>
          ` : ''}
          ${sg.tax > 0 ? `
            <tr style="color: #64748b; font-size: 12px;">
              <td colspan="2" style="padding: 4px 0;">Applicable GST (5%)</td>
              <td style="padding: 4px 0; font-weight: 600; text-align: right;">₹${Number(sg.tax).toLocaleString('en-IN')}</td>
            </tr>
          ` : ''}
        </tbody>
      </table>
    </div>
  `).join("");

  return `
    <div class="multi-seller-split-container">
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin-bottom: 18px;">
        <h4 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 4px;">
          <i class="fa-solid fa-code-branch" style="color: #0284c7; margin-right: 6px;"></i> Compare & Multi-Seller Split Procurement
        </h4>
        <p style="font-size: 13px; color: #64748b; margin: 0;">
          Select exact quantities from different suppliers. You can fulfill each item from the most cost-effective seller or split quantities across multiple suppliers to satisfy high demand.
        </p>
      </div>

      <!-- Item Split Matrix Cards -->
      ${itemCardsHTML}

      <!-- Final Purchase Allocation Review Screen (Section 12) -->
      <div class="purchase-allocation-panel" style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; padding: 20px 24px; margin-top: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #bbf7d0; padding-bottom: 12px; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
          <div>
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #15803d; letter-spacing: 0.5px;">
              <i class="fa-solid fa-clipboard-check mr-1"></i> Final Purchase Review / अंतिम समीक्षा
            </span>
            <h3 style="font-size: 18px; font-weight: 800; color: #166534; margin: 2px 0 0;">
              Purchase Allocation / खरीद आवंटन
            </h3>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase;">Consolidated Grand Total</span>
            <div style="font-size: 24px; font-weight: 900; color: #15803d;">₹${Number(grandTotal).toLocaleString('en-IN')}</div>
          </div>
        </div>

        <!-- Grouped by Seller -->
        ${sellerGroupsCount > 0 ? `
          <div style="margin-bottom: 16px;">
            <h5 style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: #166534; margin-bottom: 10px;">
              Selected Sellers & Orders Breakdown (${sellerGroupsCount} Seller Orders):
            </h5>
            ${sellerGroupsHTML}
          </div>
        ` : `
          <div style="padding: 24px; text-align: center; color: #64748b; font-size: 14px;">
            <i class="fa-solid fa-hand-pointer mr-1"></i> Enter quantities above to allocate materials across sellers.
          </div>
        `}

        <!-- Purchase Decision Summary -->
        <div style="background: #ffffff; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px;">
          <h5 style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #166534; margin-bottom: 6px;">
            Purchase Decision Checklist / खरीद निर्णय:
          </h5>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; font-size: 12px;">
            ${reqItems.map(it => {
              const itAlloc = currentAlloc[it.materialName] || {};
              const sAlloc = Object.values(itAlloc).reduce((a, b) => a + Number(b || 0), 0);
              const pct = Math.round((sAlloc / it.quantity) * 100);
              const isFull = sAlloc === it.quantity;
              return `
                <div style="color: ${sAlloc > it.quantity ? '#dc2626' : (isFull ? '#15803d' : '#475569')};">
                  <i class="fa-solid ${sAlloc > it.quantity ? 'fa-circle-xmark' : (isFull ? 'fa-circle-check' : 'fa-circle-dot')}"></i>
                  <strong>${it.materialName}:</strong> ${sAlloc} / ${it.quantity} ${it.unit} (${pct}%)
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div style="font-size: 12px; color: #166534;">
            <i class="fa-solid fa-shield-halved mr-1"></i> Secure Split Procurement: Each supplier receives only the items and exact quantities you selected.
          </div>
          <button class="btn-confirm-allocation" id="btnConfirmSplitPlan" onclick="confirmSplitPurchasePlan('${req.id}')"
            ${canConfirm ? '' : 'disabled'}
            style="background: ${canConfirm ? '#15803d' : '#94a3b8'}; color: white; border: none; padding: 12px 24px; font-size: 15px; font-weight: 800; border-radius: 8px; cursor: ${canConfirm ? 'pointer' : 'not-allowed'}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <i class="fa-solid fa-circle-check mr-1"></i> Confirm Purchase Plan / खरीद योजना की पुष्टि करें
          </button>
        </div>
      </div>
    </div>
  `;
}

function handleSplitQtyChange(reqId, matName, quoteId, val) {
  const req = currentRequests.find(r => r.id === reqId);
  if (!req) return;

  window.activeSplitAllocations = window.activeSplitAllocations || {};
  window.activeSplitAllocations[reqId] = window.activeSplitAllocations[reqId] || {};
  window.activeSplitAllocations[reqId][matName] = window.activeSplitAllocations[reqId][matName] || {};

  const numVal = Math.max(0, parseFloat(val) || 0);
  window.activeSplitAllocations[reqId][matName][quoteId] = numVal;

  renderQuotationsView(req);
}

function handleSplitMaxClick(reqId, matName, quoteId, maxAvailable, reqQuantity) {
  const req = currentRequests.find(r => r.id === reqId);
  if (!req) return;

  window.activeSplitAllocations = window.activeSplitAllocations || {};
  window.activeSplitAllocations[reqId] = window.activeSplitAllocations[reqId] || {};
  window.activeSplitAllocations[reqId][matName] = window.activeSplitAllocations[reqId][matName] || {};

  const itAlloc = window.activeSplitAllocations[reqId][matName];
  let otherAlloc = 0;
  Object.keys(itAlloc).forEach(qid => {
    if (qid !== quoteId) otherAlloc += Number(itAlloc[qid] || 0);
  });

  const remainingNeeded = Math.max(0, reqQuantity - otherAlloc);
  const fillVal = Math.min(maxAvailable, remainingNeeded);

  itAlloc[quoteId] = fillVal;

  renderQuotationsView(req);
}

async function confirmSplitPurchasePlan(requestId) {
  const req = currentRequests.find(r => r.id === requestId);
  if (!req) return;

  const currentAlloc = window.activeSplitAllocations[req.id] || {};
  const reqItems = getRequirementItemsForSplit(req);

  // Validate quantities
  for (const item of reqItems) {
    const itAlloc = currentAlloc[item.materialName] || {};
    const sumAlloc = Object.values(itAlloc).reduce((a, b) => a + Number(b || 0), 0);
    if (sumAlloc > item.quantity) {
      alert(`Cannot confirm: Total allocated for "${item.materialName}" (${sumAlloc} ${item.unit}) exceeds required quantity of ${item.quantity} ${item.unit}.`);
      return;
    }
  }

  // Build allocations grouped by seller
  const allocations = [];
  const quotes = req.quotations || [];

  quotes.forEach(q => {
    const selectedItems = [];
    let subtotal = 0;

    reqItems.forEach(it => {
      const itAlloc = currentAlloc[it.materialName] || {};
      const qty = Number(itAlloc[q.id]) || 0;
      if (qty > 0) {
        let quotedItem = null;
        if (q.items && q.items.length > 0) {
          quotedItem = q.items.find(qi => {
            const qiName = (qi.materialName || qi.name || "").toLowerCase();
            const itName = it.materialName.toLowerCase();
            return qiName.includes(itName) || itName.includes(qiName);
          }) || q.items[0];
        }
        const unitRate = quotedItem ? (quotedItem.unitPrice || quotedItem.rate || 0) : (q.quotedAmount / (it.quantity || 1));
        const lineTot = qty * unitRate;
        subtotal += lineTot;

        selectedItems.push({
          materialName: it.materialName,
          quantity: qty,
          unit: it.unit,
          unitPrice: unitRate,
          totalPrice: lineTot
        });
      }
    });

    if (selectedItems.length > 0) {
      const freight = (selectedItems.length === (q.items?.length || 1)) ? (q.costBreakdown?.freight || 0) : Math.round((q.costBreakdown?.freight || 0) * (selectedItems.length / (q.items?.length || 1)));
      const tax = Math.round((subtotal + freight) * 0.05);
      const totalAmount = subtotal + freight + tax;

      allocations.push({
        sellerId: q.providerId || q.backendId || q.id,
        quotationId: q.backendId || q.id,
        items: selectedItems,
        subtotal: subtotal,
        deliveryCharges: freight,
        taxAmount: tax,
        totalAmount: totalAmount,
        deliveryAddress: req.deliverySite || req.location,
        notes: "Multi-seller split procurement order"
      });
    }
  });

  if (allocations.length === 0) {
    alert("Please allocate at least one material quantity before confirming the purchase plan.");
    return;
  }

  const confirmBtn = document.getElementById("btnConfirmSplitPlan");
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Generating Seller Orders...';
  }

  const token = getCleanToken();
  const matId = req.backendId || req.id;

  if (token) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/material-orders/allocate?materialRequestId=${encodeURIComponent(matId)}`, {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ allocations: allocations })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        closeQuotationsModal();
        await loadCustomerRequests();
        showToast(
          "Purchase Plan Confirmed! / खरीद योजना की पुष्टि!",
          `Successfully allocated items across ${allocations.length} seller(s). Separate seller orders have been dispatched.`
        );
        return;
      } else {
        alert(data.error || "Failed to confirm purchase plan.");
        if (confirmBtn) {
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = '<i class="fa-solid fa-circle-check mr-1"></i> Confirm Purchase Plan / खरीद योजना की पुष्टि करें';
        }
        return;
      }
    } catch (err) {
      console.error("Split allocation API error:", err);
    }
  }

  // Fallback for preview / demo
  req.status = "Purchase Plan Confirmed";
  req.statusEn = "Purchase Plan Confirmed";
  req.statusHi = "खरीद योजना की पुष्टि";
  req.allocatedOrdersCount = allocations.length;
  closeQuotationsModal();
  renderSummaryMetrics();
  renderRequests();
  showToast(
    "Purchase Plan Confirmed!",
    `Successfully created ${allocations.length} separate seller order(s). Track fulfillment in My Orders.`
  );
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
