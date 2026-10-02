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
    typeLabel: "Direct Material Purchase",
    title: "OPC 53 Grade Cement (UltraTech)",
    category: "Building Material",
    material: "OPC 53 Grade Cement",
    quantity: "100 Bags (50kg each)",
    targetProvider: "ABC Building Materials",
    location: "Sector 62, Noida, Uttar Pradesh",
    deliverySite: "Plot 42, Block B, Industrial Corridor",
    submittedDate: "Today, 10:30 AM",
    submittedTimestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hrs ago
    status: "Pending",
    description: "Urgent procurement of 100 bags 53 grade cement for foundation slab casting. Requires delivery within 48 hours to site with BIS batch test certificates.",
    quotations: [
      {
        id: "BB-QT-101",
        providerName: "ABC Building Materials",
        providerType: "MATERIAL_SELLER",
        providerTypeLabel: "Material Seller",
        rating: 4.9,
        reviewsCount: 42,
        isVerified: true,
        location: "Sector 63, Noida",
        phone: "+91 98112 34567",
        email: "sales@abcmaterials.in",
        quotedAmount: 38000,
        timeline: "2 Days",
        validity: "7 Days",
        warranty: "BIS Batch Certified Fresh Stock",
        paymentTerms: "100% on Site Delivery",
        submittedAgo: "2 hours ago",
        status: "Received",
        costBreakdown: {
          items: [
            { name: "UltraTech OPC 53 Grade Cement (50kg bag)", qty: "100 Bags", rate: 360, amount: 36000 }
          ],
          labour: 1000,
          freight: 1000,
          taxes: 0,
          total: 38000
        },
        terms: {
          payment: "Cash / UPI / NEFT upon physical verification and offloading.",
          warranty: "Manufactured within last 15 days, tamper-proof sealed bags.",
          included: ["Loading at depot", "Transportation to site", "Offloading at ground floor"],
          excluded: ["Carrying to upper floors", "Storage waterproofing tarpaulin"]
        },
        message: "We have fresh UltraTech OPC 53 in stock at our Sector 63 warehouse. Can deliver tomorrow morning in a single covered truckload."
      },
      {
        id: "BB-QT-102",
        providerName: "Shree Balaji Cement Traders",
        providerType: "MATERIAL_SELLER",
        providerTypeLabel: "Material Seller",
        rating: 4.7,
        reviewsCount: 29,
        isVerified: true,
        location: "Sector 10, Noida",
        phone: "+91 98730 45678",
        email: "balajicement@yahoo.com",
        quotedAmount: 37500,
        timeline: "3 Days",
        validity: "5 Days",
        warranty: "Manufacturer ISI Warranty",
        paymentTerms: "50% Advance, 50% on Delivery",
        submittedAgo: "1 hour ago",
        status: "Received",
        costBreakdown: {
          items: [
            { name: "Ambuja Powercem OPC 53 Grade", qty: "100 Bags", rate: 355, amount: 35500 }
          ],
          labour: 1200,
          freight: 800,
          taxes: 0,
          total: 37500
        },
        terms: {
          payment: "50% advance booking, balance 50% via RTGS on unloading.",
          warranty: "Full manufacturer test report included with dispatch invoice.",
          included: ["Delivery till site entrance", "Weighment slip provided"],
          excluded: ["Stacking inside godown"]
        },
        message: "Direct dealership quote with premium moisture-resistant packaging. Guaranteed delivery within 72 hours."
      },
      {
        id: "BB-QT-103",
        providerName: "National Building Supplies Corp",
        providerType: "MATERIAL_SELLER",
        providerTypeLabel: "Material Seller",
        rating: 4.6,
        reviewsCount: 19,
        isVerified: false,
        location: "Surajpur Industrial Area, Greater Noida",
        phone: "+91 99100 87654",
        email: "orders@nationalbuild.com",
        quotedAmount: 39200,
        timeline: "1 Day (Express)",
        validity: "10 Days",
        warranty: "100% Genuine Replacement Guarantee",
        paymentTerms: "Net 15 Days Credit Available",
        submittedAgo: "30 mins ago",
        status: "Received",
        costBreakdown: {
          items: [
            { name: "ACC Concrete Plus 53 Grade OPC", qty: "100 Bags", rate: 370, amount: 37000 }
          ],
          labour: 1200,
          freight: 1000,
          taxes: 0,
          total: 39200
        },
        terms: {
          payment: "Same day dispatch on purchase order confirmation.",
          warranty: "Immediate free bag replacement if any caking or tear occurs during transit.",
          included: ["Express 24-hr transit", "Dedicated site supervisor on delivery"],
          excluded: ["Labour beyond 50 meters from vehicle"]
        },
        message: "Same-day express delivery dispatch ready. We can have the truck at your Sector 62 location by 4 PM today."
      }
    ]
  },
  {
    id: "BB-REQ-002",
    type: "MATERIAL_REQUIREMENT",
    typeLabel: "Material Requirement",
    title: "Fe-550D TMT Steel Rebars (12mm & 16mm)",
    category: "Structural Steel",
    material: "Fe-550D Primary TMT Steel (Tata Tiscon / Jindal Panther)",
    quantity: "2.5 Metric Tons (12mm: 1.5 MT, 16mm: 1.0 MT)",
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
    status: "Pending",
    description: "Direct hire request sent to certified electrical technician for complete apartment rewiring: conduit grooving, copper wire pulling (Finolex/Polycab), 8-way distribution board setup with RCCB, inverter changeover switch, and modular switchboard box fitting.",
    quotations: [
      {
        id: "BB-QT-301",
        providerName: "Raj Electrical & Automation Services",
        providerType: "PROFESSIONAL",
        providerTypeLabel: "Professional",
        rating: 4.9,
        reviewsCount: 56,
        isVerified: true,
        location: "Vaishali Sector 4, Ghaziabad",
        phone: "+91 98188 77665",
        email: "raj.electrician@gmail.com",
        quotedAmount: 28500,
        timeline: "5 Days",
        validity: "15 Days",
        warranty: "6 Months Service & Breakdown Warranty",
        paymentTerms: "30% Start, 40% Mid, 30% Testing & Handover",
        submittedAgo: "3 hours ago",
        status: "Received",
        costBreakdown: {
          items: [
            { name: "Wall Chasing & PVC Conduit Piping (approx 450 Rft)", qty: "450 Rft", rate: 22, amount: 9900 },
            { name: "Copper Cable Pulling (Light, Power, AC circuits)", qty: "3 BHK Unit", rate: 9500, amount: 9500 },
            { name: "8-Way Double Door MCB / RCCB Distribution Board Setup", qty: "1 DB Unit", rate: 4500, amount: 4500 },
            { name: "Modular Switch Box Dressing & Inverter Line Routing", qty: "12 Boards", rate: 380, amount: 4600 }
          ],
          labour: 0,
          freight: 0,
          taxes: 0,
          total: 28500
        },
        terms: {
          payment: "30% on mobilization, 40% after wire pulling, 30% on megger insulation testing handover.",
          warranty: "6 months free emergency breakdown support for any tripping or short circuit.",
          included: ["Certified grade-A wireman tools", "Megger insulation resistance test", "Circuit labeling"],
          excluded: ["Cost of wire bundles, switches, and MCBs (client to provide material or billed at actuals)"]
        },
        message: "Govt licensed supervisor with 12+ years experience in premium apartments. Ready to start from Thursday with a 3-member skilled team."
      }
    ]
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
    description: "Direct hire for geotechnical investigation and soil bearing capacity test for structural design of warehouse. Required standard penetration test (SPT) and laboratory grain size analysis report.",
    quotations: [
      {
        id: "BB-QT-601",
        providerName: "Dr. Verma Geo-Tech Consultants",
        providerType: "PROFESSIONAL",
        providerTypeLabel: "Professional",
        rating: 5.0,
        reviewsCount: 48,
        isVerified: true,
        location: "Knowledge Park 3, Greater Noida",
        phone: "+91 98110 99001",
        email: "verma.geotech@consultants.in",
        quotedAmount: 18000,
        timeline: "3 Days",
        validity: "30 Days",
        warranty: "NABL Accredited Lab Certification",
        paymentTerms: "50% Field Work, 50% Report Submission",
        submittedAgo: "4 days ago",
        status: "Accepted",
        costBreakdown: {
          items: [
            { name: "3 x 15m Soil Borehole Drilling with SPT", qty: "3 Holes", rate: 4500, amount: 13500 },
            { name: "Lab Testing & Formal NABL Soil Bearing Capacity Report", qty: "1 Report", rate: 4500, amount: 4500 }
          ],
          labour: 0,
          freight: 0,
          taxes: 0,
          total: 18000
        },
        terms: {
          payment: "50% upon field rig deployment, 50% upon dispatch of signed NABL test report.",
          warranty: "Full acceptance guarantee with town planning and structural engineer approval.",
          included: ["Hydraulic drilling rig", "On-site sample sealing", "Foundation recommendation calculations"],
          excluded: ["Site water arrangement for drilling"]
        },
        message: "NABL certified laboratory with retired IIT professor technical head. Full compliance with IS 1892 & IS 2131."
      },
      {
        id: "BB-QT-602",
        providerName: "SoilMaster Testing Labs Pvt Ltd",
        providerType: "PROFESSIONAL",
        providerTypeLabel: "Professional",
        rating: 4.7,
        reviewsCount: 18,
        isVerified: true,
        location: "Sector 83, Noida",
        phone: "+91 97115 66778",
        email: "info@soilmasterlabs.com",
        quotedAmount: 22000,
        timeline: "4 Days",
        validity: "15 Days",
        warranty: "NABL Certified",
        paymentTerms: "100% Advance",
        submittedAgo: "4 days ago",
        status: "Received",
        costBreakdown: {
          items: [
            { name: "Geotechnical Investigation & Core Extraction", qty: "3 Boreholes", rate: 6000, amount: 18000 },
            { name: "Detailed Soil Profile & Triaxial Shear Report", qty: "1 Report", rate: 4000, amount: 4000 }
          ],
          labour: 0,
          freight: 0,
          taxes: 0,
          total: 22000
        },
        terms: {
          payment: "100% mobilization advance.",
          warranty: "Certified by registered geotechnical consultant.",
          included: ["Field testing", "Moisture, Atterberg limits and triaxial test"],
          excluded: ["Excavator assistance"]
        },
        message: "Equipped with automated rotary core drill rig. Standard turnaround 4 working days."
      }
    ]
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
    status: "Pending",
    description: "Direct hire inquiry sent for hydraulic pressure testing of CPVC lines at 10 kg/cm² and installation of sensor-operated commercial basin taps and dual-flush cisterns.",
    quotations: [] // ZERO QUOTATIONS
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
      sessionStorage.clear();
      window.location.href = "index.html";
    });
  }
}

/* =========================================================
   4. METRICS COMPUTATION & RENDERING
   ========================================================= */
function renderSummaryMetrics() {
  const totalRequests = currentRequests.length;
  const pendingRequests = currentRequests.filter(r => r.status.toLowerCase() === "pending").length;
  const activeRequests = currentRequests.filter(r => r.status.toLowerCase() === "active").length;
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
  const typeClass = req.type.toLowerCase().replace(/_/g, "-");
  const statusClass = req.status.toLowerCase();
  const quoteCount = req.quotations ? req.quotations.length : 0;

  // Determine Quotation Section State
  let quotationSectionHTML = "";
  if (quoteCount === 0) {
    quotationSectionHTML = `
      <div class="card-quotation-section no-quotes">
        <div class="quotation-badge-meta">
          <div class="quote-icon-bubble">
            <i class="fa-regular fa-clock"></i>
          </div>
          <div class="quote-count-details">
            <span class="quote-count-label">Quotation Received</span>
            <span class="quote-count-heading">No Quotations Yet</span>
            <span class="quote-preview-providers">Waiting for verified providers to respond to your request.</span>
          </div>
        </div>
        <button class="btn-waiting-quotes" title="Quotations will appear here once received" disabled>
          <i class="fa-solid fa-hourglass-half"></i> Waiting for Quotations
        </button>
      </div>
    `;
  } else {
    const quoteLabel = quoteCount === 1 ? "1 Quotation Received" : `${quoteCount} Quotations Received`;
    const btnLabel = quoteCount === 1 ? "View Quotation" : "View Quotations";
    
    // Sample preview providers list
    const previewProviders = req.quotations.map(q => q.providerName).slice(0, 2).join(", ") + 
      (req.quotations.length > 2 ? ` +${req.quotations.length - 2} more` : "");

    quotationSectionHTML = `
      <div class="card-quotation-section has-quotes">
        <div class="quotation-badge-meta">
          <div class="quote-icon-bubble">
            <i class="fa-solid fa-file-invoice-dollar"></i>
          </div>
          <div class="quote-count-details">
            <span class="quote-count-label">Quotation Received</span>
            <span class="quote-count-heading">${quoteLabel}</span>
            <span class="quote-preview-providers">From: ${previewProviders}</span>
          </div>
        </div>
        <button class="btn-view-quotations" onclick="openQuotationsModal('${req.id}')">
          <i class="fa-solid fa-eye"></i> ${btnLabel}
        </button>
      </div>
    `;
  }

  // Detail Items based on Request Type
  let specificDetailsHTML = "";
  if (req.type === "DIRECT_BUY") {
    specificDetailsHTML = `
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-cube"></i> Material & Specs</span>
        <span class="detail-value">${req.material}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-scale-balanced"></i> Quantity</span>
        <span class="detail-value highlight-blue">${req.quantity}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-store"></i> Preferred Seller</span>
        <span class="detail-value">${req.targetProvider || "Any Qualified Seller"}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-location-dot"></i> Delivery Site</span>
        <span class="detail-value">${req.location}</span>
      </div>
    `;
  } else if (req.type === "MATERIAL_REQUIREMENT") {
    specificDetailsHTML = `
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-layer-group"></i> Required Material</span>
        <span class="detail-value">${req.material}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-weight-hanging"></i> Required Quantity</span>
        <span class="detail-value highlight-blue">${req.quantity}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-location-dot"></i> Site Location</span>
        <span class="detail-value">${req.location}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-truck-ramp-box"></i> Offloading Site</span>
        <span class="detail-value">${req.deliverySite || req.location}</span>
      </div>
    `;
  } else if (req.type === "DIRECT_HIRE") {
    specificDetailsHTML = `
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-screwdriver-wrench"></i> Service Required</span>
        <span class="detail-value">${req.service}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-user-check"></i> Targeted Provider</span>
        <span class="detail-value highlight-blue">${req.targetProvider || "Independent Professional"}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-ruler-combined"></i> Scope / Volume</span>
        <span class="detail-value">${req.quantity}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-location-dot"></i> Job Address</span>
        <span class="detail-value">${req.location}</span>
      </div>
    `;
  } else if (req.type === "PROJECT_REQUIREMENT") {
    specificDetailsHTML = `
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-trowel-bricks"></i> Construction Scope</span>
        <span class="detail-value">${req.service}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-chart-area"></i> Built-up Area</span>
        <span class="detail-value highlight-blue">${req.quantity}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-map-location-dot"></i> Plot Address</span>
        <span class="detail-value">${req.location}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label"><i class="fa-solid fa-hard-hat"></i> Contract Category</span>
        <span class="detail-value">Turnkey Structure Contract</span>
      </div>
    `;
  }

  // Edit & Cancel Button Labels based on type
  const editLabel = req.type.includes("REQUIREMENT") ? "Edit Requirement" : "Edit Request";
  const cancelLabel = req.type.includes("REQUIREMENT") ? "Cancel Requirement" : "Cancel";

  return `
    <div class="request-card" id="card-${req.id}">
      <!-- Header Bar -->
      <div class="card-header-bar">
        <div class="header-left-badges">
          <span class="type-badge ${typeClass}">
            <i class="fa-solid fa-tag"></i> ${req.typeLabel}
          </span>
          <span class="request-id-badge">${req.id}</span>
        </div>
        <div class="header-right-status">
          <span class="status-badge ${statusClass}">
            <i class="fa-solid fa-circle-dot"></i> ${req.status}
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

        <!-- CRITICAL: Prominent Quotation Received Section directly on card -->
        ${quotationSectionHTML}
      </div>

      <!-- Action Footer -->
      <div class="card-actions-footer">
        <button class="btn-card-action primary-subtle" onclick="openRequestDetailsModal('${req.id}')">
          <i class="fa-solid fa-circle-info"></i> View Details
        </button>
        <button class="btn-card-action" onclick="handleEditRequest('${req.id}')">
          <i class="fa-solid fa-pen-to-square"></i> ${editLabel}
        </button>
        <button class="btn-card-action text-red" onclick="handleCancelRequestPrompt('${req.id}')">
          <i class="fa-solid fa-ban"></i> ${cancelLabel}
        </button>
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
      const matchLoc = req.location.toLowerCase().includes(searchVal);
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
    if (statusFilter !== "ALL" && req.status.toUpperCase() !== statusFilter.toUpperCase()) {
      return false;
    }

    // Quotation status filter
    const quoteCount = req.quotations ? req.quotations.length : 0;
    if (quoteFilter === "NO_QUOTES" && quoteCount > 0) return false;
    if (quoteFilter === "HAS_QUOTES" && quoteCount === 0) return false;
    if (quoteFilter === "MULTIPLE_QUOTES" && quoteCount <= 1) return false;

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
      <div class="quotations-cards-grid">
        ${req.quotations.map(quote => createQuotationCardHTML(quote, req)).join("")}
      </div>
    `;
  } else {
    container.innerHTML = createComparisonTableHTML(req.quotations, req);
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

  const quoteCount = req.quotations ? req.quotations.length : 0;

  body.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 18px;">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px;">
        <div>
          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Status</span>
          <div style="font-size: 14px; font-weight: 800; color: #1e293b; margin-top: 2px;">${req.status}</div>
        </div>
        <div>
          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Category / Material</span>
          <div style="font-size: 14px; font-weight: 800; color: #1e293b; margin-top: 2px;">${req.material || req.service || req.category}</div>
        </div>
        <div>
          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Quantity / Volume</span>
          <div style="font-size: 14px; font-weight: 800; color: #0284c7; margin-top: 2px;">${req.quantity}</div>
        </div>
        <div>
          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Quotations Received</span>
          <div style="font-size: 14px; font-weight: 800; color: #10b981; margin-top: 2px;">${quoteCount} Received</div>
        </div>
      </div>

      ${req.estimatedTotal ? `
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px 16px; font-size: 13.5px; color: #166534;">
        <span style="font-weight: 700;"><i class="fa-solid fa-receipt"></i> Direct Purchase Pricing:</span> Item Price: ₹${Number(req.materialPrice || req.materialAmount || 0).toLocaleString("en-IN")} • Freight: ₹${Number(req.transportationCost || 0).toLocaleString("en-IN")} • <strong>Total: ₹${Number(req.estimatedTotal).toLocaleString("en-IN")}</strong>
        ${req.verificationCode ? `<br><small style="color: #15803d; font-weight: 600;">Verification Code: ${req.verificationCode}</small>` : ''}
      </div>
      ` : ''}

      <div>
        <h5 style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">Site Address & Location</h5>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; font-size: 13.5px; color: #334155;">
          <i class="fa-solid fa-location-dot" style="color: #ef4444; margin-right: 6px;"></i> ${req.location}
          ${req.deliverySite ? `<br><small style="color: #64748b; margin-left: 20px;">Offloading Area: ${req.deliverySite}</small>` : ''}
        </div>
      </div>

      <div>
        <h5 style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">Detailed Specifications & Notes</h5>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; font-size: 13.5px; color: #334155; line-height: 1.6;">
          ${req.description}
        </div>
      </div>

      <div style="font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px;">
        <i class="fa-regular fa-clock"></i> Submitted on: ${req.submittedDate} • Reference ID: <strong>${req.id}</strong>
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
