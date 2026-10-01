tailwind.config = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          navy: '#0f172a',
          slate: '#1e293b',
          surface: '#f8fafc',
          border: '#e2e8f0',
          muted: '#64748b'
        },
        accent: {
          emerald: '#10b981',
          blue: '#0284c7',
          amber: '#f59e0b',
          purple: '#8b5cf6',
          rose: '#f43f5e'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
        'card': '0 4px 6px -1px rgba(15, 23, 42, 0.04), 0 2px 4px -2px rgba(15, 23, 42, 0.04)',
        'float': '0 12px 24px -4px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.03)'
      }
    }
  }
};

/* DYNAMIC PERSONA CONFIGURATION SYSTEM (Javascript Object) */
const PERSONAS = {
  civil_engineer: {
    id: "BBD-CE-84920",
    name: "Rahul Sharma",
    type: "Civil Engineer",
    category: "Structural Consultation & BOQ",
    location: "Noida, Uttar Pradesh",
    pincode: "201301",
    serviceRadius: 25,
    rating: 4.8,
    reviewsCount: 37,
    experienceYears: 8,
    completedProjects: 37,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
    about: "Licensed Civil & Structural Engineer specialized in RCC building audits, beam & column reinforcement detailing, BOQ estimation, and municipal building bylaws approvals across Delhi NCR.",
    skills: ["Structural Audit", "BOQ Estimation", "RCC Detailing", "AutoCAD", "Slump Testing", "Seismic Compliance"],
    stats: {
      newRequests: 12,
      activeProjects: 4,
      completedProjects: 37,
      upcomingWork: 6,
      totalEarnings: 184500,
      pendingPayments: 28500,
      profileViews: 1245,
      responseRate: "94%",
      completionRate: "98%"
    },
    services: [
      { id: 1, name: "Site Structural Inspection & Audit", price: "₹3,500", type: "Per Visit", duration: "1 Day", desc: "Comprehensive on-site load and RCC structural soundness evaluation with stamped report.", active: true },
      { id: 2, name: "BOQ & Material Quantity Estimation", price: "₹8,000", type: "Per Project", duration: "3 Days", desc: "Exhaustive Bill of Quantities itemized by cement bags, TMT rebars, aggregate, and labor milestones.", active: true },
      { id: 3, name: "Residential Construction Supervision", price: "₹25,000", type: "Per Month", duration: "Project Life", desc: "Regular weekly 3-day quality checks, slab casting supervision, and contractor compliance audits.", active: true },
      { id: 4, name: "Foundation & Soil Soil-Bearing Consultation", price: "₹6,000", type: "Per Site", duration: "2 Days", desc: "Recommendation of raft or isolated footings based on soil investigation metrics.", active: false }
    ],
    requests: [
      { id: "REQ-7101", customer: "Amit Kumar", project: "Duplex Villa Structural Consultation", service: "Civil Engineer", location: "Sector 44, Noida", budget: "₹25,000", date: "10 Oct 2026", distance: "8.4 km", time: "2 hrs ago", status: "New", desc: "Need structural engineer to inspect lintel and beam placement for a 3-storey independent duplex." },
      { id: "REQ-7092", customer: "Sunil Narang", project: "BOQ for Commercial Warehouse", service: "Civil Engineer", location: "Greater Noida West", budget: "₹18,000", date: "14 Oct 2026", distance: "14.2 km", time: "5 hrs ago", status: "Pending", desc: "Complete material quantity estimation needed prior to vendor tendering." },
      { id: "REQ-7080", customer: "Vikas Mehra", project: "Slab Casting Quality Audit", service: "Civil Engineer", location: "Indirapuram, Ghaziabad", budget: "₹7,500", date: "18 Oct 2026", distance: "11.0 km", time: "1 day ago", status: "Accepted", desc: "On-site sampling and slump test supervision for second-floor roof slab." }
    ],
    projects: [
      { id: "PRJ-901", name: "Greenfield Villa Structural Works", customer: "Vikram Singhania", service: "Civil Supervision", start: "02 Sep 2026", deadline: "28 Oct 2026", budget: "₹75,000", progress: 68, status: "Active", nextMilestone: "Roof Slab Casting" },
      { id: "PRJ-902", name: "Apex Heights Foundation Audit", customer: "Apex Infra Tech", service: "Structural Consultation", start: "20 Sep 2026", deadline: "15 Oct 2026", budget: "₹42,000", progress: 85, status: "Active", nextMilestone: "Final Safety Stamped Report" },
      { id: "PRJ-903", name: "Modern Townhome BOQ", customer: "Neha Kapoor", service: "Quantity Estimation", start: "12 Aug 2026", deadline: "01 Sep 2026", budget: "₹22,000", progress: 100, status: "Completed", nextMilestone: "All milestones released" }
    ],
    documents: [
      { title: "B.Tech Civil Engineering Degree", issuer: "AKTU Lucknow", idNumber: "AKTU-••••-9812", status: "Verified", date: "Jul 2018" },
      { title: "Chartered Engineer Certification", issuer: "Institution of Engineers (India)", idNumber: "IEI-AM••••-410", status: "Verified", date: "Jan 2021" },
      { title: "Aadhaar Identity Authentication (Masked)", issuer: "Govt of India (UIDAI)", idNumber: "•••• •••• 8912", status: "Verified", date: "Authenticated" },
      { title: "Empanelled Structural Consultant", issuer: "NOIDA Urban Dev Authority", idNumber: "NOD-EMP-••••-24", status: "Verified", date: "Valid till 2028" }
    ]
  },

  interior_designer: {
    id: "BBD-ID-33910",
    name: "Priya Verma",
    type: "Interior Designer",
    category: "Interior Architecture & Spatial Design",
    location: "Gurugram, Haryana",
    pincode: "122002",
    serviceRadius: 35,
    rating: 4.9,
    reviewsCount: 52,
    experienceYears: 6,
    completedProjects: 48,
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
    about: "Award-winning interior stylist focusing on modern biophilic residential spaces, ergonomic modular kitchens, false ceiling lighting design, and photorealistic 3D visualization.",
    skills: ["3D Rendering", "Modular Kitchens", "False Ceiling", "Lighting Design", "Material Curation", "Space Planning"],
    stats: {
      newRequests: 15,
      activeProjects: 5,
      completedProjects: 48,
      upcomingWork: 8,
      totalEarnings: 342000,
      pendingPayments: 54000,
      profileViews: 2180,
      responseRate: "98%",
      completionRate: "97%"
    },
    services: [
      { id: 11, name: "Complete 3D Walkthrough & Moodboard", price: "₹28,000", type: "Per Apartment", duration: "7 Days", desc: "High-definition 4K renders of living, master bedroom, and kitchen with finishes specified.", active: true },
      { id: 12, name: "Turnkey Modular Kitchen Design", price: "₹18,000", type: "Fixed Quote", duration: "4 Days", desc: "Cabinet spatial layout, quartz countertop selection, and Hafele/Blum hardware BOQ.", active: true },
      { id: 13, name: "False Ceiling & Ambient Lighting Plan", price: "₹12,000", type: "Per Floor", duration: "3 Days", desc: "Detailed CAD electrical co-ordination drawings for POP cove lighting and magnetic tracks.", active: true }
    ],
    requests: [
      { id: "REQ-7204", customer: "Deepak Agarwal", project: "4BHK Luxury Penthouse Makeover", service: "Interior Designer", location: "Golf Course Road, Gurugram", budget: "₹1,40,000", date: "12 Oct 2026", distance: "4.5 km", time: "30 mins ago", status: "New", desc: "Full modern contemporary interior design with walk-in closets and bespoke bar counter." },
      { id: "REQ-7201", customer: "Ritika Sen", project: "Modular Kitchen & Living Refresh", service: "Interior Designer", location: "DLF Phase 4, Gurugram", budget: "₹45,000", date: "15 Oct 2026", distance: "6.1 km", time: "4 hrs ago", status: "Pending", desc: "Scandinavian open layout design with pantry optimization." }
    ],
    projects: [
      { id: "PRJ-911", name: "DLF Magnolias 3BHK Renovation", customer: "Rajiv Singhal", service: "Interior Architecture", start: "10 Aug 2026", deadline: "30 Oct 2026", budget: "₹1,85,000", progress: 74, status: "Active", nextMilestone: "Custom Wardrobes Installation" }
    ],
    documents: [
      { title: "B.Des Interior Architecture", issuer: "NID Ahmedabad", idNumber: "NID-••••-674", status: "Verified", date: "Jun 2020" },
      { title: "IIID Professional Certification", issuer: "Institute of Indian Interior Designers", idNumber: "IIID-••••-104", status: "Verified", date: "Aug 2021" },
      { title: "Aadhaar Identity Verification (Masked)", issuer: "Govt of India (UIDAI)", idNumber: "•••• •••• 3419", status: "Verified", date: "Authenticated" }
    ]
  },

  electrician: {
    id: "BBD-EL-40291",
    name: "Amit Kumar",
    type: "Electrician",
    category: "Electrical Contracting & Maintenance",
    location: "Delhi (South)",
    pincode: "110017",
    serviceRadius: 20,
    rating: 4.7,
    reviewsCount: 89,
    experienceYears: 10,
    completedProjects: 112,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    about: "Govt. Licensed Class-A Wireman specializing in complete conduit wiring for new builds, DB box distribution, short circuit detection, smart home automation, and solar inverter setup.",
    skills: ["Conduit Wiring", "MCB/DB Dressing", "Smart Automation", "Earthing & Surge", "Load Calculation"],
    stats: {
      newRequests: 18,
      activeProjects: 3,
      completedProjects: 112,
      upcomingWork: 11,
      totalEarnings: 98000,
      pendingPayments: 12400,
      profileViews: 1890,
      responseRate: "96%",
      completionRate: "99%"
    },
    services: [
      { id: 21, name: "Complete Residential Conduit Wiring", price: "₹24", type: "Per Sq. Ft", duration: "5-7 Days", desc: "Laying ISI conduits, copper pull wiring, switchboard fixing, and loop testing.", active: true },
      { id: 22, name: "Main Distribution Board (DB) Dressing", price: "₹2,200", type: "Per Panel", duration: "4 Hours", desc: "RCCB/MCB distribution balance, phase segregations, and neutral link testing.", active: true }
    ],
    requests: [
      { id: "REQ-7301", customer: "Manish Joshi", project: "Complete 3-Floor House Wiring", service: "Electrician", location: "Saket, New Delhi", budget: "₹38,000", date: "11 Oct 2026", distance: "3.2 km", time: "1 hr ago", status: "New", desc: "Fresh building conduit wire pull with Polycab cables and Legrand DB installation." }
    ],
    projects: [
      { id: "PRJ-921", name: "Green Park Commercial Showroom Wiring", customer: "Komal Sethi", service: "Electrical Installation", start: "28 Sep 2026", deadline: "14 Oct 2026", budget: "₹34,000", progress: 60, status: "Active", nextMilestone: "DB Box Wiring & Phase Balancing" }
    ],
    documents: [
      { title: "Govt. Wireman Grade-A License", issuer: "Delhi Electrical Inspectorate", idNumber: "DEL-W-••••-890", status: "Verified", date: "Valid till 2029" },
      { title: "ITI Certificate in Electrical Works", issuer: "NCVT", idNumber: "ITI-••••-551", status: "Verified", date: "May 2015" },
      { title: "Aadhaar Card (Masked)", issuer: "Govt of India", idNumber: "•••• •••• 9012", status: "Verified", date: "Authenticated" }
    ]
  },

  plumber: {
    id: "BBD-PL-55102",
    name: "Rakesh Yadav",
    type: "Plumber",
    category: "Sanitary & Plumbing Specialist",
    location: "Ghaziabad, Uttar Pradesh",
    pincode: "201012",
    serviceRadius: 18,
    rating: 4.8,
    reviewsCount: 64,
    experienceYears: 7,
    completedProjects: 78,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
    about: "Certified piping & sanitation technician expert in CPVC/UPVC concealed pipe layouts, grohe/kohler diverter installations, water tank booster pumps, and underground drainage slope alignments.",
    skills: ["CPVC/UPVC Piping", "Concealed Diverters", "Booster Pumps", "Drainage Outflow", "Leak Inspection"],
    stats: {
      newRequests: 9,
      activeProjects: 2,
      completedProjects: 78,
      upcomingWork: 4,
      totalEarnings: 82500,
      pendingPayments: 9500,
      profileViews: 940,
      responseRate: "93%",
      completionRate: "98%"
    },
    services: [
      { id: 31, name: "Concealed Bathroom Pipe Fitting", price: "₹6,500", type: "Per Bathroom", duration: "2 Days", desc: "Pressure-tested hot/cold lines with wall-hung commode chair bracket mounting.", active: true },
      { id: 32, name: "Overhead Tank & Pressure Booster Setup", price: "₹2,800", type: "Per Setup", duration: "Half Day", desc: "Multi-point distribution lines with anti-vibration mountings.", active: true }
    ],
    requests: [
      { id: "REQ-7401", customer: "Harsh Bansal", project: "Master Bath Concealed Diverter Installation", service: "Plumber", location: "Vasundhara, Ghaziabad", budget: "₹8,500", date: "09 Oct 2026", distance: "4.8 km", time: "40 mins ago", status: "New", desc: "Need Grohe 3-inlet thermostatic diverter fitted inside brick chase with pressure test." }
    ],
    projects: [
      { id: "PRJ-931", name: "Duplex Sanitary Pipeline Setup", customer: "Pooja Chawla", service: "Plumbing Contract", start: "22 Sep 2026", deadline: "12 Oct 2026", budget: "₹26,000", progress: 80, status: "Active", nextMilestone: "Sanitary Ware Fixing" }
    ],
    documents: [
      { title: "National Skills Qualification (NSQF - Plumbing)", issuer: "Skill India", idNumber: "SKL-PL-••••-332", status: "Verified", date: "Nov 2019" },
      { title: "Aadhaar Card (Masked)", issuer: "Govt of India", idNumber: "•••• •••• 7120", status: "Verified", date: "Authenticated" }
    ]
  },

  mason: {
    id: "BBD-MS-30988",
    name: "Sanjay Kumar",
    type: "Mason / Mistri",
    category: "Civil Masonry & Plastering Specialist",
    location: "Greater Noida, Uttar Pradesh",
    pincode: "201310",
    serviceRadius: 30,
    rating: 4.6,
    reviewsCount: 41,
    experienceYears: 14,
    completedProjects: 93,
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80",
    about: "Head Mistri leading skilled labor crews for first-class red brickwork, 1:4 plastering, PCC levelling, AAC lightweight block laying, and precision tile leveling systems.",
    skills: ["AAC Blockwork", "Red Brick Masonry", "Sponge Plastering", "Tile Cladding", "Foundation PCC"],
    stats: {
      newRequests: 11,
      activeProjects: 3,
      completedProjects: 93,
      upcomingWork: 5,
      totalEarnings: 142000,
      pendingPayments: 21000,
      profileViews: 1100,
      responseRate: "90%",
      completionRate: "96%"
    },
    services: [
      { id: 41, name: "9-inch Red Brick / AAC Block Masonry", price: "₹18", type: "Per Sq. Ft", duration: "Team Work", desc: "Plumb line verified mortar bonding with expansion joint treatment.", active: true },
      { id: 42, name: "Double Coat Sand Face External Plaster", price: "₹14", type: "Per Sq. Ft", duration: "Team Work", desc: "Water-resistant cement mortar with smooth sponge finish.", active: true }
    ],
    requests: [
      { id: "REQ-7501", customer: "Rajender Pal", project: "Boundary Wall & Gate Pillar Masonry", service: "Mason / Mistri", location: "Sector 1, Greater Noida", budget: "₹32,000", date: "16 Oct 2026", distance: "9.2 km", time: "3 hrs ago", status: "New", desc: "180 running feet 6-ft high 9-inch brick boundary wall with RCC column encasement." }
    ],
    projects: [
      { id: "PRJ-941", name: "Farmhouse AAC Block Outer Boundary", customer: "Alok Goel", service: "Masonry Contract", start: "25 Sep 2026", deadline: "20 Oct 2026", budget: "₹58,000", progress: 45, status: "Active", nextMilestone: "Coping & Internal Plastering" }
    ],
    documents: [
      { title: "Building & Construction Workers (BOCW) ID", issuer: "UP Labour Welfare Board", idNumber: "UP-BOCW-••••-881", status: "Verified", date: "Valid till 2027" },
      { title: "Aadhaar Card (Masked)", issuer: "Govt of India", idNumber: "•••• •••• 5590", status: "Verified", date: "Authenticated" }
    ]
  }
};

let activePersonaKey = 'civil_engineer';
let activeRoute = 'dashboard';
let currentPro = JSON.parse(JSON.stringify(PERSONAS[activePersonaKey]));

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');

  const icons = {
    success: 'fa-circle-check text-emerald-500',
    error: 'fa-circle-xmark text-rose-500',
    info: 'fa-circle-info text-blue-500',
    warning: 'fa-triangle-exclamation text-amber-500'
  };

  toast.className = `pointer-events-auto flex items-center p-4 space-x-3 rounded-2xl bg-white border border-slate-200 shadow-float text-xs text-slate-800 transition-all duration-300 transform translate-x-12 opacity-0`;
  toast.innerHTML = `
    <i class="fa-solid ${icons[type] || icons.info} text-lg flex-shrink-0"></i>
    <div class="flex-1 font-semibold">${message}</div>
    <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('translate-x-12', 'opacity-0');
  }, 20);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-x-4');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('hidden');
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('hidden');
}

function toggleNotificationDropdown() {
  const el = document.getElementById('notif-dropdown');
  el.classList.toggle('hidden');
  document.getElementById('user-menu').classList.add('hidden');
}

function toggleUserDropdown() {
  const el = document.getElementById('user-menu');
  el.classList.toggle('hidden');
  document.getElementById('notif-dropdown').classList.add('hidden');
}

// Keyboard shortcut handler (Ctrl+K or Cmd+K)
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const searchInput = document.getElementById('global-search');
    if (searchInput) searchInput.focus();
  }
});

// Close dropdowns on outside click
window.addEventListener('click', (e) => {
  if (!e.target.closest('#notif-dropdown') && !e.target.closest('button[onclick*="toggleNotificationDropdown"]')) {
    document.getElementById('notif-dropdown')?.classList.add('hidden');
  }
  if (!e.target.closest('#user-menu') && !e.target.closest('button[onclick*="toggleUserDropdown"]')) {
    document.getElementById('user-menu')?.classList.add('hidden');
  }
});

function switchPersona(newKey) {
  if (!PERSONAS[newKey]) return;
  activePersonaKey = newKey;
  currentPro = JSON.parse(JSON.stringify(PERSONAS[newKey]));

  // Update Sidebar & Header Elements
  document.getElementById('sidebar-role-select').value = newKey;
  document.getElementById('side-name').innerText = currentPro.name;
  document.getElementById('side-role').innerText = currentPro.type;
  document.getElementById('side-loc').innerText = currentPro.location;
  document.getElementById('side-avatar').src = currentPro.avatar;

  document.getElementById('top-greeting').innerHTML = `Good Day, ${currentPro.name} 👋`;
  document.getElementById('top-role-badge').innerText = currentPro.type;
  document.getElementById('top-name').innerText = currentPro.name;
  document.getElementById('top-avatar').src = currentPro.avatar;
  document.getElementById('menu-name').innerText = currentPro.name;
  document.getElementById('menu-id').innerText = `ID: ${currentPro.id}`;

  // Re-render the current view with newly loaded trade metadata
  navigate(activeRoute);
  showToast(`Active trade switched to ${currentPro.type} (${currentPro.name})`, 'success');
}

function navigate(route) {
  activeRoute = route;

  // Update sidebar visual active state
  document.querySelectorAll('.nav-link').forEach(btn => {
    if (btn.getAttribute('data-route') === route) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const container = document.getElementById('main-view');

  switch (route) {
    case 'dashboard':
      renderDashboard(container);
      break;
    case 'find-work':
      renderFindWork(container);
      break;
    case 'requests':
      renderRequests(container);
      break;
    case 'projects':
      renderProjects(container);
      break;
    case 'schedule':
      renderSchedule(container);
      break;
    case 'earnings':
      renderEarnings(container);
      break;
    case 'services':
      renderServices(container);
      break;
    case 'portfolio':
      renderPortfolio(container);
      break;
    case 'profile':
      renderProfile(container);
      break;
    case 'documents':
      renderDocuments(container);
      break;
    case 'availability':
      renderAvailability(container);
      break;
    case 'messages':
      renderMessages(container);
      break;
    case 'reviews':
      renderReviews(container);
      break;
    default:
      renderDashboard(container);
  }

  container.scrollTop = 0;
}

function renderDashboard(container) {
  container.innerHTML = `
    <div class="space-y-7 max-w-[1700px] mx-auto">
      <!-- TOP ROW: Professional Trust & Verification Card (Masked Privacy) -->
      <div class="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-subtle flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div class="flex items-center space-x-4">
          <div class="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl flex-shrink-0 border border-emerald-100">
            <i class="fa-solid fa-shield-check"></i>
          </div>
          <div>
            <div class="flex items-center gap-2.5">
              <h2 class="text-base font-bold text-slate-900">BuildBid Professional Verification & Escrow Protection</h2>
              <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">100% VERIFIED</span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">Government ID, trade competence credentials, and payout banking lines are authenticated.</p>
          </div>
        </div>

        <!-- Masked Credential Tags -->
        <div class="flex flex-wrap items-center gap-3 text-xs">
          <div class="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-2">
            <i class="fa-solid fa-id-card text-emerald-600"></i>
            <span class="text-slate-600">Aadhaar (UIDAI): <strong class="text-slate-800">•••• •••• 8912</strong></span>
          </div>
          <div class="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-2">
            <i class="fa-solid fa-stamp text-emerald-600"></i>
            <span class="text-slate-600">Trade License: <strong class="text-slate-800">${currentPro.documents[1]?.idNumber || 'AUTH-••••-410'}</strong></span>
          </div>
          <div class="px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-emerald-800 font-semibold">
            <i class="fa-solid fa-building-columns"></i>
            <span>Direct Escrow Active</span>
          </div>
        </div>
      </div>

      <!-- 8 DESKTOP STATS CARDS GRID -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:border-orange-300 transition">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-semibold">New Work Requests</span>
            <span class="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-xs">
              <i class="fa-solid fa-inbox"></i>
            </span>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-3xl font-extrabold text-slate-900">${currentPro.stats.newRequests}</span>
            <span class="text-xs font-bold text-emerald-600">+12% this month</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">Pending client bids in your area</p>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:border-blue-300 transition">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-semibold">Active Projects</span>
            <span class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
              <i class="fa-solid fa-hammer"></i>
            </span>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-3xl font-extrabold text-slate-900">0${currentPro.stats.activeProjects}</span>
            <span class="text-xs font-bold text-blue-600">On Track</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">Milestones under execution</p>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:border-emerald-300 transition">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-semibold">Total Cleared Earnings</span>
            <span class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
              <i class="fa-solid fa-indian-rupee-sign"></i>
            </span>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-3xl font-extrabold text-slate-900">₹${currentPro.stats.totalEarnings.toLocaleString('en-IN')}</span>
            <span class="text-xs font-bold text-emerald-600">+18% MoM</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">Directly settled to your bank</p>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:border-amber-300 transition">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-semibold">Pending in Escrow</span>
            <span class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xs">
              <i class="fa-solid fa-lock"></i>
            </span>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-3xl font-extrabold text-amber-600">₹${currentPro.stats.pendingPayments.toLocaleString('en-IN')}</span>
            <span class="text-xs font-bold text-amber-600">2 Milestones</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">Secured until client completion sign-off</p>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:border-purple-300 transition">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-semibold">Completed Projects</span>
            <span class="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xs">
              <i class="fa-solid fa-circle-check"></i>
            </span>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-3xl font-extrabold text-slate-900">${currentPro.stats.completedProjects}</span>
            <span class="text-xs font-bold text-purple-600">100% Delivered</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">Historical verified works</p>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:border-yellow-300 transition">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-semibold">Average Client Rating</span>
            <span class="w-8 h-8 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center text-xs">
              <i class="fa-solid fa-star"></i>
            </span>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-3xl font-extrabold text-slate-900">${currentPro.rating} ★</span>
            <span class="text-xs font-bold text-slate-500">${currentPro.reviewsCount} Reviews</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">Top tier in ${currentPro.location.split(',')[0]}</p>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:border-teal-300 transition">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-semibold">Profile Views</span>
            <span class="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-xs">
              <i class="fa-solid fa-eye"></i>
            </span>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-3xl font-extrabold text-slate-900">${currentPro.stats.profileViews}</span>
            <span class="text-xs font-bold text-teal-600">+22%</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">Searches by builders & owners</p>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:border-indigo-300 transition">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-semibold">Response & Close Rate</span>
            <span class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs">
              <i class="fa-solid fa-bolt"></i>
            </span>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-3xl font-extrabold text-slate-900">${currentPro.stats.responseRate}</span>
            <span class="text-xs font-bold text-indigo-600">${currentPro.stats.completionRate} Finish</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">Avg quotation turn: 40 mins</p>
        </div>
      </div>

      <!-- TWO-COLUMN DESKTOP SPLIT: Live Requests & Active Projects with Steppers -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <!-- LEFT COLUMN: Live Requests Inbound -->
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-6 flex flex-col">
          <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Inbound Service Requests</h3>
              <p class="text-xs text-slate-500">Clients requesting direct quotations for ${currentPro.type}</p>
            </div>
            <button onclick="navigate('requests')" class="text-xs font-semibold text-orange-600 hover:underline">View All Table</button>
          </div>

          <div class="space-y-3.5 flex-1">
            ${currentPro.requests.map(req => `
              <div class="p-4 rounded-xl border border-slate-200/90 hover:border-orange-300 transition bg-white space-y-3">
                <div class="flex items-start justify-between">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700">${req.service}</span>
                      <span class="text-xs text-slate-400">• ${req.distance} away</span>
                    </div>
                    <h4 class="text-sm font-bold text-slate-900 mt-1">${req.project}</h4>
                    <p class="text-xs text-slate-500">Client: <strong class="text-slate-700">${req.customer}</strong> • <i class="fa-solid fa-location-dot text-[10px]"></i> ${req.location}</p>
                  </div>
                  <div class="text-right">
                    <span class="text-sm font-extrabold text-slate-900 block">${req.budget}</span>
                    <span class="text-[10px] text-slate-400"><i class="fa-regular fa-clock"></i> ${req.time}</span>
                  </div>
                </div>

                <p class="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">${req.desc}</p>

                <div class="flex items-center justify-between pt-1">
                  <span class="text-[11px] font-semibold text-slate-500">Requested: ${req.date}</span>
                  <div class="flex items-center space-x-2">
                    <button onclick="openRequestModal('${req.id}')" class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition">View Scope</button>
                    <button onclick="acceptRequest('${req.id}')" class="px-3.5 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm transition">Accept Request</button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- RIGHT COLUMN: Active Projects with Milestone Stepper Trackers -->
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-6 flex flex-col">
          <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Active Works & Milestone Stepper</h3>
              <p class="text-xs text-slate-500">Live contracts, construction progress, and sign-offs</p>
            </div>
            <button onclick="navigate('projects')" class="text-xs font-semibold text-orange-600 hover:underline">Full Pipeline</button>
          </div>

          <div class="space-y-4 flex-1">
            ${currentPro.projects.map(prj => `
              <div class="p-4 rounded-xl border border-slate-200/90 bg-white space-y-3">
                <div class="flex items-start justify-between">
                  <div>
                    <div class="flex items-center gap-2">
                      <h4 class="text-sm font-bold text-slate-900">${prj.name}</h4>
                      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${prj.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">${prj.status}</span>
                    </div>
                    <p class="text-xs text-slate-500 mt-0.5">Client: ${prj.customer} • Budget: <strong class="text-slate-800">${prj.budget}</strong></p>
                  </div>
                  <div class="text-right">
                    <span class="text-xs font-bold text-orange-600">${prj.progress}% Progress</span>
                    <span class="block text-[10px] text-slate-400">Due: ${prj.deadline}</span>
                  </div>
                </div>

                <!-- Progress Bar -->
                <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div class="bg-orange-600 h-2 rounded-full transition-all duration-500" style="width: ${prj.progress}%"></div>
                </div>

                <!-- Multi-Step Stepper (Site Inspection -> Material -> Execution -> Audit -> Handover) -->
                <div class="grid grid-cols-4 gap-1.5 pt-1 text-[10px]">
                  <div class="p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1.5">
                    <i class="fa-solid fa-check"></i>
                    <span class="font-semibold truncate">1. Site Check</span>
                  </div>
                  <div class="p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1.5">
                    <i class="fa-solid fa-check"></i>
                    <span class="font-semibold truncate">2. Planning</span>
                  </div>
                  <div class="p-2 rounded-lg bg-orange-50 text-orange-800 border border-orange-200 flex items-center space-x-1.5">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <span class="font-semibold truncate">3. Execution</span>
                  </div>
                  <div class="p-2 rounded-lg bg-slate-50 text-slate-400 border border-slate-200 flex items-center space-x-1.5">
                    <i class="fa-regular fa-circle"></i>
                    <span class="font-semibold truncate">4. Audit/Sign</span>
                  </div>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span class="text-slate-500 text-[11px]">Next: <strong class="text-slate-700">${prj.nextMilestone}</strong></span>
                  <div class="space-x-1.5">
                    <button onclick="advanceProgress('${prj.id}')" class="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg transition text-[11px]">Advance Milestone</button>
                    <button onclick="navigate('messages')" class="px-3 py-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition text-[11px]">Contact Client</button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- THIRD ROW: Desktop Schedule & Monthly Earnings Velocity Chart -->
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <!-- Desktop Calendar Snapshot (1 Col) -->
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-6 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div class="flex items-center space-x-2">
                <i class="fa-regular fa-calendar-check text-orange-600"></i>
                <h3 class="text-sm font-bold text-slate-900">Upcoming Schedule</h3>
              </div>
              <button onclick="navigate('schedule')" class="text-xs text-orange-600 font-semibold hover:underline">Full Month View</button>
            </div>
            <div class="space-y-3 text-xs">
              <div class="p-3.5 bg-slate-50 rounded-xl border-l-4 border-orange-500">
                <div class="flex items-center justify-between font-bold text-slate-800">
                  <span>Duplex Villa Lintel Inspection</span>
                  <span class="text-[10px] text-orange-700 bg-orange-100 px-2 py-0.5 rounded">10:00 AM</span>
                </div>
                <p class="text-[11px] text-slate-500 mt-1">Client: Amit Kumar • Sector 44, Noida</p>
                <p class="text-[10px] text-slate-400 mt-1"><i class="fa-solid fa-car"></i> Travel time: ~22 mins</p>
              </div>
              <div class="p-3.5 bg-slate-50 rounded-xl border-l-4 border-blue-500">
                <div class="flex items-center justify-between font-bold text-slate-800">
                  <span>Commercial Warehouse BOQ Review</span>
                  <span class="text-[10px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded">03:30 PM</span>
                </div>
                <p class="text-[11px] text-slate-500 mt-1">Client: Sunil Narang • Online Consultation</p>
              </div>
            </div>
          </div>

          <button onclick="showToast('Opened Quick Slot scheduler', 'info')" class="mt-4 w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition">
            + Schedule Site Visit
          </button>
        </div>

        <!-- Pure CSS Desktop Revenue & Escrow Velocity Graph (2 Col) -->
        <div class="xl:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-6 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 class="text-sm font-bold text-slate-900">Revenue Velocity & Milestone Settlements (₹ INR)</h3>
                <p class="text-xs text-slate-500">Direct escrow releases across completed work phases</p>
              </div>
              <div class="flex items-center space-x-2 text-xs">
                <span class="px-2.5 py-1 bg-slate-100 font-semibold text-slate-700 rounded-lg">FY 2026-27</span>
                <span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg">+24% YoY Growth</span>
              </div>
            </div>

            <!-- Desktop Bar Chart Visualization -->
            <div class="h-44 w-full flex items-end justify-between gap-3 pt-4 px-4">
              <div class="flex-1 flex flex-col items-center gap-1 group">
                <span class="text-[11px] font-bold text-slate-500 group-hover:text-orange-600 transition">₹28k</span>
                <div class="w-full bg-slate-100 group-hover:bg-orange-500 rounded-t-lg h-20 transition-all chart-bar-hover"></div>
                <span class="text-[11px] text-slate-400 font-medium">May</span>
              </div>
              <div class="flex-1 flex flex-col items-center gap-1 group">
                <span class="text-[11px] font-bold text-slate-500 group-hover:text-orange-600 transition">₹34k</span>
                <div class="w-full bg-slate-100 group-hover:bg-orange-500 rounded-t-lg h-24 transition-all chart-bar-hover"></div>
                <span class="text-[11px] text-slate-400 font-medium">Jun</span>
              </div>
              <div class="flex-1 flex flex-col items-center gap-1 group">
                <span class="text-[11px] font-bold text-slate-500 group-hover:text-orange-600 transition">₹48k</span>
                <div class="w-full bg-slate-100 group-hover:bg-orange-500 rounded-t-lg h-32 transition-all chart-bar-hover"></div>
                <span class="text-[11px] text-slate-400 font-medium">Jul</span>
              </div>
              <div class="flex-1 flex flex-col items-center gap-1 group">
                <span class="text-[11px] font-bold text-slate-500 group-hover:text-orange-600 transition">₹41k</span>
                <div class="w-full bg-slate-100 group-hover:bg-orange-500 rounded-t-lg h-28 transition-all chart-bar-hover"></div>
                <span class="text-[11px] text-slate-400 font-medium">Aug</span>
              </div>
              <div class="flex-1 flex flex-col items-center gap-1 group">
                <span class="text-[11px] font-bold text-slate-500 group-hover:text-orange-600 transition">₹62k</span>
                <div class="w-full bg-slate-100 group-hover:bg-orange-500 rounded-t-lg h-36 transition-all chart-bar-hover"></div>
                <span class="text-[11px] text-slate-400 font-medium">Sep</span>
              </div>
              <div class="flex-1 flex flex-col items-center gap-1 group">
                <span class="text-[11px] font-bold text-orange-600">₹68k</span>
                <div class="w-full bg-orange-600 rounded-t-lg h-40 shadow-sm chart-bar-hover"></div>
                <span class="text-[11px] font-bold text-orange-600">Oct (Current)</span>
              </div>
            </div>
          </div>

          <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div class="flex items-center space-x-6">
              <span>Avg Contract Size: <strong class="text-slate-800">₹22,500</strong></span>
              <span>Escrow Hold Period: <strong class="text-slate-800">Direct Release on Milestone</strong></span>
            </div>
            <button onclick="navigate('earnings')" class="text-orange-600 font-semibold hover:underline">View Detailed Ledger →</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderFindWork(container) {
  container.innerHTML = `
    <div class="space-y-6 max-w-[1700px] mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Find Work & Direct Construction Tender Inquiries</h2>
          <p class="text-xs text-slate-500">Live inquiries in your territory matching ${currentPro.type} specifications.</p>
        </div>
        <div class="flex items-center space-x-3 text-xs">
          <span class="text-slate-500">Active Perimeter: <strong class="text-slate-800">${currentPro.serviceRadius} km</strong></span>
          <button onclick="navigate('availability')" class="text-orange-600 font-semibold hover:underline">Change Radius</button>
        </div>
      </div>

      <!-- Desktop Filter Bar -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-subtle grid grid-cols-4 gap-4 text-xs">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Service Specialty</label>
          <select class="w-full p-2.5 border border-slate-200 rounded-xl outline-none bg-white">
            <option>${currentPro.type} (All)</option>
            <option>On-site Supervision</option>
            <option>Consultation & BOQ</option>
          </select>
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Location Radius</label>
          <select class="w-full p-2.5 border border-slate-200 rounded-xl outline-none bg-white">
            <option>Within ${currentPro.serviceRadius} km (${currentPro.location.split(',')[0]})</option>
            <option>Within 50 km (NCR Extended)</option>
          </select>
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Budget Allocation</label>
          <select class="w-full p-2.5 border border-slate-200 rounded-xl outline-none bg-white">
            <option>Any Budget</option>
            <option>₹15,000 – ₹50,000</option>
            <option>₹50,000+</option>
          </select>
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Work Type</label>
          <select class="w-full p-2.5 border border-slate-200 rounded-xl outline-none bg-white">
            <option>All Postings</option>
            <option>Direct Client Inquiry</option>
            <option>Contractor Sub-contract</option>
          </select>
        </div>
      </div>

      <!-- Desktop Widescreen Leads Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div class="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-subtle hover:border-orange-400 transition flex flex-col justify-between space-y-4">
          <div>
            <div class="flex items-center justify-between">
              <span class="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold">Escrow Verified Client</span>
              <span class="text-sm font-extrabold text-slate-900">₹40,000</span>
            </div>
            <h3 class="text-sm font-bold text-slate-900 mt-2">Comprehensive Structural & Slab Audit for 3-Floor G+2 House</h3>
            <p class="text-xs text-slate-600 mt-1.5 line-clamp-3">Property owner in Sector 62 requiring licensed ${currentPro.type} to inspect column deflection and prepare certified reinforcement drawings before second slab casting.</p>
            <div class="flex flex-wrap gap-1.5 mt-3">
              <span class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">On-site Audit</span>
              <span class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">Immediate Start</span>
            </div>
          </div>
          <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-slate-500"><i class="fa-solid fa-location-dot"></i> Sector 62 (6.2 km)</span>
            <button onclick="openProposalModal('Comprehensive Structural Audit for G+2 House', 'Sector 62, Noida')" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold shadow-sm transition">
              Send Proposal
            </button>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-subtle hover:border-orange-400 transition flex flex-col justify-between space-y-4">
          <div>
            <div class="flex items-center justify-between">
              <span class="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold">Commercial Tender</span>
              <span class="text-sm font-extrabold text-slate-900">₹75,000</span>
            </div>
            <h3 class="text-sm font-bold text-slate-900 mt-2">Commercial Showroom Renovation & Spatial BOQ</h3>
            <p class="text-xs text-slate-600 mt-1.5 line-clamp-3">Complete execution drawings, material schedules, and labor supervision needed for 2,400 sq.ft retail space prior to contractor tendering.</p>
            <div class="flex flex-wrap gap-1.5 mt-3">
              <span class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">Turnkey</span>
              <span class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">BOQ Estimation</span>
            </div>
          </div>
          <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-slate-500"><i class="fa-solid fa-location-dot"></i> Indirapuram (11.5 km)</span>
            <button onclick="openProposalModal('Commercial Showroom Renovation & Spatial BOQ', 'Indirapuram')" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold shadow-sm transition">
              Send Proposal
            </button>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-subtle hover:border-orange-400 transition flex flex-col justify-between space-y-4">
          <div>
            <div class="flex items-center justify-between">
              <span class="px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-md text-[10px] font-bold">Urgent Site Call</span>
              <span class="text-sm font-extrabold text-slate-900">₹18,500</span>
            </div>
            <h3 class="text-sm font-bold text-slate-900 mt-2">Foundation & Retaining Wall Moisture Diagnostics</h3>
            <p class="text-xs text-slate-600 mt-1.5 line-clamp-3">Retaining wall showing severe moisture ingress during monsoon drainage check. Requires expert diagnostic and remedial plan.</p>
            <div class="flex flex-wrap gap-1.5 mt-3">
              <span class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">Diagnostics</span>
              <span class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">Urgent 24h</span>
            </div>
          </div>
          <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-slate-500"><i class="fa-solid fa-location-dot"></i> Greater Noida (14 km)</span>
            <button onclick="openProposalModal('Foundation & Retaining Wall Moisture Diagnostics', 'Greater Noida')" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold shadow-sm transition">
              Send Proposal
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderRequests(container) {
  container.innerHTML = `
    <div class="space-y-6 max-w-[1700px] mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Client Service Requests Management</h2>
          <p class="text-xs text-slate-500">Review prospective client bids, review technical requirements, and accept inquiries.</p>
        </div>
        <button onclick="navigate('find-work')" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition">
          <i class="fa-solid fa-magnifying-glass mr-1.5"></i> Find More Work
        </button>
      </div>

      <!-- Desktop Table Container -->
      <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle overflow-hidden">
        <div class="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div class="flex items-center space-x-2">
            <span class="text-xs font-bold text-slate-800">Filtered Table View</span>
            <span class="text-[11px] text-slate-500">(${currentPro.requests.length} Requests total)</span>
          </div>
          <div class="text-xs text-slate-500 flex items-center space-x-2">
            <i class="fa-solid fa-shield text-emerald-600"></i>
            <span>Customer phone & email protected under BuildBid Escrow</span>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th class="p-4">Request ID</th>
                <th class="p-4">Project & Customer</th>
                <th class="p-4">Required Service</th>
                <th class="p-4">Location</th>
                <th class="p-4">Target Date</th>
                <th class="p-4">Client Budget</th>
                <th class="p-4">Status</th>
                <th class="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${currentPro.requests.map(req => `
                <tr class="hover:bg-slate-50 transition">
                  <td class="p-4 font-mono font-bold text-slate-800">${req.id}</td>
                  <td class="p-4">
                    <div class="font-bold text-slate-900">${req.project}</div>
                    <div class="text-[11px] text-slate-500">Client: ${req.customer}</div>
                  </td>
                  <td class="p-4 font-medium text-slate-700">${req.service}</td>
                  <td class="p-4 text-slate-600">${req.location} (${req.distance})</td>
                  <td class="p-4 text-slate-600">${req.date}</td>
                  <td class="p-4 font-bold text-slate-900">${req.budget}</td>
                  <td class="p-4">
                    <span class="px-2.5 py-1 rounded-md text-[10px] font-bold ${
                      req.status === 'New' ? 'bg-orange-100 text-orange-700' :
                      req.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    }">${req.status}</span>
                  </td>
                  <td class="p-4 text-right space-x-1.5">
                    <button onclick="openRequestModal('${req.id}')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition">View Scope</button>
                    ${req.status === 'New' ? `
                      <button onclick="acceptRequest('${req.id}')" class="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold text-xs shadow-sm transition">Accept</button>
                      <button onclick="promptDecline('${req.id}')" class="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold text-xs transition">Decline</button>
                    ` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderProjects(container) {
  container.innerHTML = `
    <div class="space-y-6 max-w-[1700px] mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Active Work & Milestone Pipeline</h2>
          <p class="text-xs text-slate-500">Track execution phases, deliver technical reports, and release escrow funds.</p>
        </div>
        <span class="text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
          Active Sites: <strong class="text-slate-900">${currentPro.projects.filter(p=>p.status==='Active').length} Sites</strong>
        </span>
      </div>

      <div class="space-y-5">
        ${currentPro.projects.map(prj => `
          <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-6 space-y-5">
            <div class="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div class="flex items-center gap-3">
                  <h3 class="text-base font-bold text-slate-900">${prj.name}</h3>
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${prj.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">${prj.status}</span>
                </div>
                <p class="text-xs text-slate-500 mt-1">Contractor/Client: <strong class="text-slate-700">${prj.customer}</strong> • Service: ${prj.service}</p>
              </div>
              <div class="text-right">
                <span class="text-xs text-slate-400 block">Agreed Contract Value</span>
                <span class="text-base font-extrabold text-slate-900">${prj.budget}</span>
              </div>
            </div>

            <!-- Milestone Stepper Bar -->
            <div>
              <div class="flex items-center justify-between text-xs font-semibold mb-2">
                <span class="text-slate-600">Milestone Progress Execution</span>
                <span class="text-orange-600 font-bold">${prj.progress}% Completed</span>
              </div>
              <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div class="bg-orange-600 h-3 rounded-full transition-all duration-500" style="width: ${prj.progress}%"></div>
              </div>
            </div>

            <!-- Milestone Stages -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center space-x-2.5">
                <i class="fa-solid fa-circle-check text-emerald-600 text-base"></i>
                <div>
                  <span class="font-bold text-slate-800 block">Phase 1: Initial Inspection</span>
                  <span class="text-[10px] text-emerald-700">Verified & Released</span>
                </div>
              </div>
              <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center space-x-2.5">
                <i class="fa-solid fa-circle-check text-emerald-600 text-base"></i>
                <div>
                  <span class="font-bold text-slate-800 block">Phase 2: Drawings & BOQ</span>
                  <span class="text-[10px] text-emerald-700">Verified & Released</span>
                </div>
              </div>
              <div class="p-3 bg-orange-50 rounded-xl border border-orange-200 flex items-center space-x-2.5">
                <i class="fa-solid fa-spinner fa-spin text-orange-600 text-base"></i>
                <div>
                  <span class="font-bold text-slate-800 block">Phase 3: ${prj.nextMilestone}</span>
                  <span class="text-[10px] text-orange-700 font-medium">In Execution</span>
                </div>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center space-x-2.5">
                <i class="fa-regular fa-circle text-slate-400 text-base"></i>
                <div>
                  <span class="font-bold text-slate-800 block">Phase 4: Final Sign-off</span>
                  <span class="text-[10px] text-slate-400">Escrow Pending</span>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <div class="flex items-center space-x-6 text-slate-500">
                <span><i class="fa-regular fa-calendar"></i> Started: <strong>${prj.start}</strong></span>
                <span><i class="fa-regular fa-clock"></i> Target: <strong>${prj.deadline}</strong></span>
              </div>
              <div class="space-x-2">
                <button onclick="advanceProgress('${prj.id}')" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl transition">
                  <i class="fa-solid fa-arrow-up-right-dots mr-1"></i> Advance Milestone (+15%)
                </button>
                <button onclick="markComplete('${prj.id}')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition shadow-sm">
                  <i class="fa-solid fa-check mr-1"></i> Mark Project Complete
                </button>
                <button onclick="navigate('messages')" class="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition">
                  Chat Client
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderSchedule(container) {
  container.innerHTML = `
    <div class="space-y-6 max-w-[1700px] mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Desktop Schedule & Site Inspection Calendar</h2>
          <p class="text-xs text-slate-500">Manage client visits, engineering inspections, and milestone deadlines.</p>
        </div>
        <button onclick="showToast('Appointment dialog opened', 'info')" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-xl transition shadow-sm">
          <i class="fa-solid fa-plus mr-1.5"></i> Add Appointment Slot
        </button>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-6">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div class="flex items-center space-x-3">
            <span class="text-base font-bold text-slate-900">October 2026</span>
            <span class="text-xs px-2.5 py-0.5 bg-orange-50 text-orange-700 font-semibold rounded-md">Indian Standard Time (IST)</span>
          </div>
          <div class="flex items-center space-x-2">
            <button class="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50">Month</button>
            <button class="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">Week</button>
          </div>
        </div>

        <!-- Calendar Matrix -->
        <div class="grid grid-cols-7 gap-2 text-center text-xs">
          <div class="p-2 font-bold text-slate-400">Sunday</div>
          <div class="p-2 font-bold text-slate-400">Monday</div>
          <div class="p-2 font-bold text-slate-400">Tuesday</div>
          <div class="p-2 font-bold text-slate-400">Wednesday</div>
          <div class="p-2 font-bold text-slate-400">Thursday</div>
          <div class="p-2 font-bold text-slate-400">Friday</div>
          <div class="p-2 font-bold text-slate-400">Saturday</div>

          ${generateDesktopCalendarDays()}
        </div>
      </div>
    </div>
  `;
}

function generateDesktopCalendarDays() {
  let html = '';
  // Oct 1 2026 is Thursday (Index 4)
  for (let i = 0; i < 4; i++) {
    html += `<div class="h-28 p-2 bg-slate-50/40 rounded-xl border border-dashed border-slate-200 opacity-40"></div>`;
  }
  for (let d = 1; d <= 31; d++) {
    const hasEvent = d === 10 || d === 12 || d === 18;
    html += `
      <div class="h-28 p-2.5 rounded-xl border border-slate-100 hover:border-orange-400 text-left transition flex flex-col justify-between ${d === 10 ? 'bg-orange-50/30 ring-1 ring-orange-300' : 'bg-white'}">
        <span class="font-bold text-xs ${d === 10 ? 'text-orange-600' : 'text-slate-700'}">${d}</span>
        ${hasEvent ? `
          <div class="p-1.5 rounded-lg bg-orange-100 text-orange-800 text-[10px] font-bold leading-tight truncate">
            ${d === 10 ? '10:00 AM • Site Audit' : (d === 12 ? '02:00 PM • BOQ Review' : 'Slab Inspection')}
          </div>
        ` : '<span class="text-[10px] text-slate-300">Open Slot</span>'}
      </div>
    `;
  }
  return html;
}

function renderEarnings(container) {
  container.innerHTML = `
    <div class="space-y-6 max-w-[1700px] mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Earnings, Escrow Settlements & Tax Statements</h2>
          <p class="text-xs text-slate-500">Full audit trail of customer payments, escrow guarantees, and TDS calculations.</p>
        </div>
        <button onclick="showToast('Downloaded FY 2026-27 GST-compliant Tax Voucher PDF', 'success')" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition">
          <i class="fa-solid fa-file-invoice mr-1.5"></i> Download Tax Statement
        </button>
      </div>

      <!-- Cards -->
      <div class="grid grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-subtle">
          <span class="text-xs text-slate-500 font-semibold">Total Lifetime Settled</span>
          <h3 class="text-2xl font-extrabold text-slate-900 mt-1">₹${currentPro.stats.totalEarnings.toLocaleString('en-IN')}</h3>
          <p class="text-[11px] text-emerald-600 font-bold mt-1"><i class="fa-solid fa-arrow-trend-up"></i> +18% from last quarter</p>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-subtle">
          <span class="text-xs text-slate-500 font-semibold">This Month (Oct 2026)</span>
          <h3 class="text-2xl font-extrabold text-slate-900 mt-1">₹68,400</h3>
          <p class="text-[11px] text-slate-500 mt-1">4 Milestones Cleared</p>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-subtle">
          <span class="text-xs text-slate-500 font-semibold">Protected in Escrow</span>
          <h3 class="text-2xl font-extrabold text-amber-600 mt-1">₹${currentPro.stats.pendingPayments.toLocaleString('en-IN')}</h3>
          <p class="text-[11px] text-slate-400 mt-1">Awaiting client completion sign-off</p>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-subtle">
          <span class="text-xs text-slate-500 font-semibold">Ready for Withdrawal</span>
          <h3 class="text-2xl font-extrabold text-emerald-600 mt-1">₹49,900</h3>
          <button onclick="showToast('Transfer of ₹49,900 initiated to HDFC Bank A/C ending in 4109', 'success')" class="mt-2 w-full py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition">
            Transfer to Bank (T+1)
          </button>
        </div>
      </div>

      <!-- Transactions Ledger -->
      <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle overflow-hidden">
        <div class="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 class="text-xs font-bold text-slate-900">Recent Milestone Settlements</h3>
          <span class="text-xs text-slate-400">Escrow Protected</span>
        </div>
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
            <tr>
              <th class="p-4">Transaction ID</th>
              <th class="p-4">Project / Milestone</th>
              <th class="p-4">Amount</th>
              <th class="p-4">Date</th>
              <th class="p-4">Payout Method</th>
              <th class="p-4">Status</th>
              <th class="p-4 text-right">Invoice</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr class="hover:bg-slate-50">
              <td class="p-4 font-mono font-bold text-slate-800">TXN-902188</td>
              <td class="p-4">
                <div class="font-bold text-slate-900">Greenfield Villa Milestone #1</div>
                <div class="text-[10px] text-slate-400">Client: Vikram Singhania</div>
              </td>
              <td class="p-4 font-extrabold text-emerald-600">₹25,000</td>
              <td class="p-4 text-slate-600">01 Oct 2026</td>
              <td class="p-4 text-slate-600">Direct UPI / Escrow</td>
              <td class="p-4"><span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Settled</span></td>
              <td class="p-4 text-right"><button onclick="showToast('Downloading Tax Voucher #TXN-902188', 'info')" class="text-orange-600 font-semibold hover:underline">Voucher</button></td>
            </tr>
            <tr class="hover:bg-slate-50">
              <td class="p-4 font-mono font-bold text-slate-800">TXN-894120</td>
              <td class="p-4">
                <div class="font-bold text-slate-900">Apex Heights Foundation Audit</div>
                <div class="text-[10px] text-slate-400">Client: Apex Infra Tech</div>
              </td>
              <td class="p-4 font-extrabold text-emerald-600">₹14,500</td>
              <td class="p-4 text-slate-600">26 Sep 2026</td>
              <td class="p-4 text-slate-600">NEFT Bank Transfer</td>
              <td class="p-4"><span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Settled</span></td>
              <td class="p-4 text-right"><button onclick="showToast('Downloading Tax Voucher #TXN-894120', 'info')" class="text-orange-600 font-semibold hover:underline">Voucher</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderServices(container) {
  container.innerHTML = `
    <div class="space-y-6 max-w-[1700px] mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-900">My Service Catalog & Published Rates</h2>
          <p class="text-xs text-slate-500">Configure prices, scope terms, and inspection turnaround for your public profile.</p>
        </div>
        <button onclick="openModal('modal-add-service')" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-xl transition shadow-sm">
          <i class="fa-solid fa-plus mr-1.5"></i> Add New Service
        </button>
      </div>

      <div class="grid grid-cols-2 gap-5">
        ${currentPro.services.map(srv => `
          <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-5 flex flex-col justify-between space-y-3">
            <div>
              <div class="flex items-start justify-between">
                <div>
                  <h3 class="text-sm font-bold text-slate-900">${srv.name}</h3>
                  <span class="text-base font-extrabold text-orange-600">${srv.price}</span>
                  <span class="text-xs text-slate-400 font-normal"> / ${srv.type}</span>
                </div>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${srv.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}">
                  ${srv.active ? 'Active on Profile' : 'Hidden'}
                </span>
              </div>
              <p class="text-xs text-slate-600 mt-2">${srv.desc}</p>
              <p class="text-[11px] text-slate-500 mt-2"><i class="fa-regular fa-clock text-slate-400 mr-1"></i> Turnaround: <strong>${srv.duration}</strong></p>
            </div>

            <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <button onclick="toggleServiceActive(${srv.id})" class="font-semibold text-slate-600 hover:text-slate-900">
                ${srv.active ? '<i class="fa-regular fa-eye-slash mr-1"></i> Deactivate' : '<i class="fa-regular fa-eye mr-1"></i> Activate'}
              </button>
              <div class="space-x-1.5">
                <button onclick="showToast('Service updated in cache', 'info')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-xs transition">Edit</button>
                <button onclick="deleteService(${srv.id})" class="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold text-xs transition">Remove</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderPortfolio(container) {
  container.innerHTML = `
    <div class="space-y-6 max-w-[1700px] mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Portfolio & Site Work Showcase</h2>
          <p class="text-xs text-slate-500">High-resolution project photography showcasing verified competence in ${currentPro.type}.</p>
        </div>
        <button onclick="showToast('Upload portfolio images opened', 'info')" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-xl transition shadow-sm">
          <i class="fa-solid fa-cloud-arrow-up mr-1.5"></i> Add Portfolio Project
        </button>
      </div>

      <div class="grid grid-cols-3 gap-6">
        <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-subtle group">
          <div class="h-48 bg-slate-100 relative overflow-hidden">
            <img src="https://images.unsplash.com/photo-1541888946425-d0fbb18615f3?w=600&auto=format&fit=crop&q=80" alt="Work" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
            <span class="absolute top-3 right-3 px-2.5 py-0.5 bg-slate-900/80 text-white text-[10px] font-bold rounded-lg backdrop-blur-xs">2026 Completed</span>
          </div>
          <div class="p-5 space-y-2">
            <h4 class="text-sm font-bold text-slate-900">G+3 RCC Frame & Raft Foundation</h4>
            <p class="text-xs text-slate-500">Sector 137, Noida • Complete structural supervision & BOQ</p>
            <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span class="text-orange-600 font-bold">₹1.2 Cr Valuation</span>
              <button onclick="showToast('Viewing full resolution gallery', 'info')" class="text-slate-600 font-semibold hover:underline">Gallery (8 Photos)</button>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-subtle group">
          <div class="h-48 bg-slate-100 relative overflow-hidden">
            <img src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&auto=format&fit=crop&q=80" alt="Work" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
            <span class="absolute top-3 right-3 px-2.5 py-0.5 bg-slate-900/80 text-white text-[10px] font-bold rounded-lg backdrop-blur-xs">2026 Completed</span>
          </div>
          <div class="p-5 space-y-2">
            <h4 class="text-sm font-bold text-slate-900">Commercial Warehouse Truss Design</h4>
            <p class="text-xs text-slate-500">Ecotech III, Greater Noida • Steel quantity optimization</p>
            <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span class="text-orange-600 font-bold">18,000 Sq.Ft</span>
              <button onclick="showToast('Viewing full resolution gallery', 'info')" class="text-slate-600 font-semibold hover:underline">Gallery (5 Photos)</button>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-subtle group">
          <div class="h-48 bg-slate-100 relative overflow-hidden">
            <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80" alt="Work" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
            <span class="absolute top-3 right-3 px-2.5 py-0.5 bg-slate-900/80 text-white text-[10px] font-bold rounded-lg backdrop-blur-xs">2025 Completed</span>
          </div>
          <div class="p-5 space-y-2">
            <h4 class="text-sm font-bold text-slate-900">Residential Villa Expansion Audit</h4>
            <p class="text-xs text-slate-500">DLF Phase 2, Gurugram • Load test & structural retrofit</p>
            <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span class="text-orange-600 font-bold">Full Stamped Audit</span>
              <button onclick="showToast('Viewing full resolution gallery', 'info')" class="text-slate-600 font-semibold hover:underline">Gallery (12 Photos)</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderProfile(container) {
  container.innerHTML = `
    <div class="space-y-6 max-w-[1700px] mx-auto">
      <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle overflow-hidden">
        <div class="h-40 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 flex justify-end">
          <button onclick="showToast('Profile editing enabled', 'info')" class="h-9 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-xs transition">
            <i class="fa-solid fa-pen mr-1.5"></i> Edit Profile Information
          </button>
        </div>
        <div class="px-8 pb-8 relative">
          <div class="flex items-end justify-between -mt-14">
            <div class="flex items-end space-x-5">
              <img src="${currentPro.avatar}" alt="Avatar" class="w-28 h-28 rounded-2xl object-cover ring-4 ring-white shadow-float">
              <div>
                <h3 class="text-xl font-bold text-slate-900">${currentPro.name}</h3>
                <p class="text-xs font-semibold text-orange-600">${currentPro.type} • ${currentPro.category}</p>
                <p class="text-xs text-slate-500 mt-1"><i class="fa-solid fa-location-dot"></i> ${currentPro.location} (${currentPro.pincode})</p>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-center px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
                <span class="text-sm font-bold text-slate-900 block">${currentPro.rating} ★</span>
                <span class="text-[11px] text-slate-400">Rating</span>
              </div>
              <div class="text-center px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
                <span class="text-sm font-bold text-slate-900 block">${currentPro.completedProjects}</span>
                <span class="text-[11px] text-slate-400">Completed</span>
              </div>
              <div class="text-center px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
                <span class="text-sm font-bold text-slate-900 block">${currentPro.experienceYears} Yrs</span>
                <span class="text-[11px] text-slate-400">Experience</span>
              </div>
            </div>
          </div>

          <div class="mt-8 space-y-5 border-t border-slate-100 pt-6 text-xs">
            <div>
              <h4 class="font-bold text-slate-900 mb-1.5 text-sm">About the Professional</h4>
              <p class="text-slate-600 leading-relaxed text-xs">${currentPro.about}</p>
            </div>
            <div>
              <h4 class="font-bold text-slate-900 mb-2 text-sm">Verified Skills & Engineering Competencies</h4>
              <div class="flex flex-wrap gap-2">
                ${currentPro.skills.map(s => `<span class="px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg">${s}</span>`).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderDocuments(container) {
  container.innerHTML = `
    <div class="space-y-6 max-w-[1700px] mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Documents, Licenses & Regulatory Verification</h2>
          <p class="text-xs text-slate-500">Government identity records and trade licenses are cryptographically verified and masked.</p>
        </div>
        <button onclick="showToast('Upload certification opened', 'info')" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-xl transition shadow-sm">
          <i class="fa-solid fa-cloud-arrow-up mr-1.5"></i> Upload Credential
        </button>
      </div>

      <div class="grid grid-cols-2 gap-5">
        ${currentPro.documents.map(doc => `
          <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-5 flex items-start justify-between">
            <div class="flex items-start space-x-4">
              <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
                <i class="fa-solid fa-file-shield"></i>
              </div>
              <div>
                <h4 class="text-xs font-bold text-slate-900">${doc.title}</h4>
                <p class="text-[11px] text-slate-500">Authority: ${doc.issuer}</p>
                <p class="text-xs font-mono text-slate-700 mt-1">ID Number: <strong>${doc.idNumber}</strong></p>
                <span class="text-[10px] text-slate-400 mt-0.5 block">Approved: ${doc.date}</span>
              </div>
            </div>
            <div class="flex flex-col items-end space-y-2">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Verified</span>
              <button onclick="showToast('Displaying masked verification record', 'info')" class="text-xs text-orange-600 font-semibold hover:underline">View File</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderAvailability(container) {
  container.innerHTML = `
    <div class="space-y-6 max-w-[1700px] mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Geographic Service Territory & Availability</h2>
          <p class="text-xs text-slate-500">Configure weekly dispatch timings, emergency consultations, and travel radius.</p>
        </div>
        <button onclick="showToast('Settings saved to profile', 'success')" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition">
          Save Parameters
        </button>
      </div>

      <div class="grid grid-cols-2 gap-6">
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-6 space-y-4">
          <h3 class="text-xs font-bold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider text-slate-400">Regular Weekly Timings</h3>
          <div class="space-y-3 text-xs">
            ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => `
              <div class="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50">
                <span class="font-semibold text-slate-700 w-28">${day}</span>
                <span class="text-slate-500">${day === 'Sunday' ? 'By Appointment Only' : '09:00 AM – 06:30 PM'}</span>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" ${day !== 'Sunday' ? 'checked' : ''} class="sr-only peer">
                  <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-6 flex flex-col justify-between">
          <div>
            <h3 class="text-xs font-bold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider text-slate-400">Coverage Radius</h3>
            <div class="p-3 bg-slate-50 rounded-xl text-xs space-y-1 mt-4">
              <p class="font-bold text-slate-800">Primary Hub: ${currentPro.location}</p>
              <p class="text-slate-500">Pincode: ${currentPro.pincode}</p>
            </div>
            <div class="mt-6 space-y-2 text-xs">
              <div class="flex items-center justify-between font-semibold">
                <span class="text-slate-700">Service Perimeter</span>
                <span id="rad-val" class="text-orange-600 font-bold">${currentPro.serviceRadius} km</span>
              </div>
              <input type="range" min="5" max="80" value="${currentPro.serviceRadius}" oninput="document.getElementById('rad-val').innerText = this.value + ' km'; currentPro.serviceRadius = parseInt(this.value);" class="w-full accent-orange-600 cursor-pointer">
            </div>
          </div>
          <div class="h-44 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs">
            <i class="fa-solid fa-map-location-dot text-3xl text-slate-400 mb-2"></i>
            <p class="font-semibold text-slate-700">Direct Geo-Fencing Active</p>
            <p class="text-[11px] text-slate-400">Receives verified leads within ${currentPro.serviceRadius} km</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderMessages(container) {
  container.innerHTML = `
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle overflow-hidden flex h-[calc(100vh-125px)] max-w-[1700px] mx-auto">
      <!-- LEFT CONVERSATIONS LIST (320px) -->
      <div class="w-80 border-r border-slate-200 flex flex-col flex-shrink-0">
        <div class="p-4 border-b border-slate-100">
          <h3 class="text-xs font-bold text-slate-900">Direct Client Messages</h3>
          <div class="relative mt-2">
            <input type="text" placeholder="Search chats..." class="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none">
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs">
          <div class="p-4 bg-orange-50/60 border-l-4 border-orange-500 cursor-pointer">
            <div class="flex items-center justify-between font-bold text-slate-800">
              <span>Amit Kumar</span>
              <span class="text-[10px] text-orange-600 font-normal">2m ago</span>
            </div>
            <p class="text-xs text-slate-600 truncate mt-0.5">Duplex Villa Structural Inspection</p>
            <p class="text-[11px] text-slate-400 truncate mt-0.5">Please bring the rebound hammer for the concrete test.</p>
          </div>

          <div class="p-4 hover:bg-slate-50 cursor-pointer">
            <div class="flex items-center justify-between font-bold text-slate-800">
              <span>Vikram Singhania</span>
              <span class="text-[10px] text-slate-400 font-normal">2h ago</span>
            </div>
            <p class="text-xs text-slate-600 truncate mt-0.5">Greenfield Villa Milestone #2</p>
            <p class="text-[11px] text-slate-400 truncate mt-0.5">Approved the slab drawings yesterday.</p>
          </div>
        </div>
      </div>

      <!-- RIGHT CHAT PANE -->
      <div class="flex-1 flex flex-col min-w-0 bg-[#fbfcfd]">
        <div class="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
          <div>
            <h4 class="text-xs font-bold text-slate-900">Amit Kumar</h4>
            <p class="text-[11px] text-slate-500">Project: Duplex Villa Structural Consultation • Verified Client</p>
          </div>
          <button onclick="showToast('Customer direct contact is initiated via secure masked line: +91 11-4091-XXXX', 'info')" class="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl">
            <i class="fa-solid fa-phone mr-1.5"></i> Call via BuildBid Protected Line
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6 space-y-4 text-xs" id="chat-stream">
          <div class="flex justify-start">
            <div class="max-w-lg bg-white p-3.5 rounded-2xl rounded-tl-none border border-slate-200 shadow-2xs space-y-1">
              <p class="text-slate-800">Hello ${currentPro.name}, can we confirm your visit for tomorrow 10:00 AM at Sector 44?</p>
              <span class="text-[10px] text-slate-400 block text-right">09:42 AM</span>
            </div>
          </div>

          <div class="flex justify-end">
            <div class="max-w-lg bg-orange-600 text-white p-3.5 rounded-2xl rounded-tr-none shadow-2xs space-y-1">
              <p>Yes Amit ji, I will arrive with the non-destructive rebound hammer and measuring laser for the beam inspection.</p>
              <span class="text-[10px] text-orange-200 block text-right">09:45 AM</span>
            </div>
          </div>
        </div>

        <form onsubmit="handleSendMsg(event)" class="p-4 bg-white border-t border-slate-200 flex items-center space-x-3">
          <button type="button" onclick="showToast('Attachment dialog opened', 'info')" class="p-2 text-slate-400 hover:text-slate-600"><i class="fa-solid fa-paperclip text-base"></i></button>
          <input type="text" id="chat-input" placeholder="Type your response to the client..." required class="flex-1 text-xs px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-orange-500">
          <button type="submit" class="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-xl shadow-sm transition">
            <i class="fa-solid fa-paper-plane mr-1.5"></i> Send
          </button>
        </form>
      </div>
    </div>
  `;
}

function renderReviews(container) {
  container.innerHTML = `
    <div class="space-y-6 max-w-[1700px] mx-auto">
      <div>
        <h2 class="text-lg font-bold text-slate-900">Client Reviews & Credibility Rating</h2>
        <p class="text-xs text-slate-500">Verified feedback submitted by property owners after milestone sign-offs.</p>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-6 flex items-center gap-8">
        <div class="text-center pr-8 border-r border-slate-100">
          <span class="text-5xl font-extrabold text-slate-900">${currentPro.rating}</span>
          <div class="flex justify-center text-amber-400 text-sm my-1.5">
            <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star-half-stroke"></i>
          </div>
          <span class="text-xs text-slate-400">Based on ${currentPro.reviewsCount} verified reviews</span>
        </div>

        <div class="flex-1 space-y-2 text-xs">
          <div class="flex items-center gap-3">
            <span class="w-14 text-slate-500 font-semibold">5 Star</span>
            <div class="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div class="bg-amber-400 h-2.5 rounded-full" style="width: 85%"></div>
            </div>
            <span class="w-10 text-right font-bold text-slate-700">85%</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="w-14 text-slate-500 font-semibold">4 Star</span>
            <div class="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div class="bg-amber-400 h-2.5 rounded-full" style="width: 12%"></div>
            </div>
            <span class="w-10 text-right font-bold text-slate-700">12%</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="w-14 text-slate-500 font-semibold">3 Star</span>
            <div class="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div class="bg-amber-400 h-2.5 rounded-full" style="width: 3%"></div>
            </div>
            <span class="w-10 text-right font-bold text-slate-700">3%</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function openRequestModal(reqId) {
  const req = currentPro.requests.find(r => r.id === reqId) || currentPro.requests[0];
  const body = document.getElementById('modal-request-body');
  body.innerHTML = `
    <div class="space-y-4 text-xs">
      <div class="p-4 bg-slate-50 rounded-xl space-y-1">
        <span class="text-[10px] font-bold text-orange-600 uppercase tracking-wider">${req.service}</span>
        <h4 class="text-sm font-bold text-slate-900">${req.project}</h4>
        <p class="text-slate-500">Customer: <strong class="text-slate-700">${req.customer}</strong> • Target Date: ${req.date}</p>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="p-3.5 border border-slate-200 rounded-xl">
          <span class="text-slate-400 block text-[10px]">Estimated Budget</span>
          <span class="text-base font-extrabold text-slate-900">${req.budget}</span>
        </div>
        <div class="p-3.5 border border-slate-200 rounded-xl">
          <span class="text-slate-400 block text-[10px]">Site Distance</span>
          <span class="text-base font-extrabold text-slate-900">${req.distance}</span>
        </div>
      </div>

      <div>
        <h5 class="font-bold text-slate-800 mb-1">Project Scope & Client Requirements</h5>
        <p class="text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">${req.desc}</p>
      </div>

      <div class="p-3 bg-blue-50 rounded-xl text-blue-800 text-[11px] flex items-center space-x-2">
        <i class="fa-solid fa-lock"></i>
        <span>BuildBid Shield: Client direct contact numbers are masked until quotation acceptance to prevent off-platform disputes.</span>
      </div>

      <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
        <button onclick="closeModal('modal-request-detail')" class="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-semibold">Close</button>
        <button onclick="acceptRequest('${req.id}'); closeModal('modal-request-detail');" class="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold shadow-sm">Accept Request</button>
      </div>
    </div>
  `;
  openModal('modal-request-detail');
}

function acceptRequest(reqId) {
  const r = currentPro.requests.find(x => x.id === reqId);
  if (r) {
    r.status = 'Accepted';
    showToast(`Request ${reqId} accepted and added to Active Works pipeline!`, 'success');
    navigate(activeRoute);
  }
}

function promptDecline(reqId) {
  const confirmBtn = document.getElementById('confirm-action-btn');
  document.getElementById('confirm-title').innerText = "Decline Work Request?";
  document.getElementById('confirm-msg').innerText = "The client will be matched with another verified professional in your area.";

  confirmBtn.onclick = () => {
    currentPro.requests = currentPro.requests.filter(r => r.id !== reqId);
    closeModal('modal-confirm');
    showToast(`Request ${reqId} was declined`, 'info');
    navigate(activeRoute);
  };
  openModal('modal-confirm');
}

function openProposalModal(title, loc) {
  document.getElementById('proposal-target-desc').innerText = `${title} • ${loc}`;
  openModal('modal-proposal');
}

function handleProposalSubmit(e) {
  e.preventDefault();
  closeModal('modal-proposal');
  showToast('Official quotation submitted. Customer notified via SMS & In-App!', 'success');
}

function handleNewService(e) {
  e.preventDefault();
  const title = document.getElementById('srv-title').value;
  const rate = '₹' + document.getElementById('srv-rate').value;
  const basis = document.getElementById('srv-basis').value;
  const turnaround = document.getElementById('srv-turnaround').value;
  const desc = document.getElementById('srv-desc').value;

  currentPro.services.unshift({
    id: Date.now(),
    name: title,
    price: rate,
    type: basis,
    duration: turnaround,
    desc: desc,
    active: true
  });

  closeModal('modal-add-service');
  showToast(`Service "${title}" published to your public profile`, 'success');
  navigate('services');
}

function toggleServiceActive(id) {
  const s = currentPro.services.find(x => x.id === id);
  if (s) {
    s.active = !s.active;
    showToast(`Service "${s.name}" is now ${s.active ? 'active' : 'hidden'}`, 'info');
    navigate('services');
  }
}

function deleteService(id) {
  currentPro.services = currentPro.services.filter(x => x.id !== id);
  showToast('Service removed from catalog', 'info');
  navigate('services');
}

function advanceProgress(prjId) {
  const p = currentPro.projects.find(x => x.id === prjId);
  if (p) {
    p.progress = Math.min(100, p.progress + 15);
    if (p.progress === 100) p.status = 'Completed';
    showToast(`Progress for ${p.name} updated to ${p.progress}%`, 'success');
    navigate(activeRoute);
  }
}

function markComplete(prjId) {
  const p = currentPro.projects.find(x => x.id === prjId);
  if (p) {
    p.progress = 100;
    p.status = 'Completed';
    showToast(`Project marked complete! Escrow payout initiated.`, 'success');
    navigate(activeRoute);
  }
}

function handleSendMsg(e) {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const val = input.value.trim();
  if (!val) return;

  const stream = document.getElementById('chat-stream');
  const msg = document.createElement('div');
  msg.className = "flex justify-end";
  msg.innerHTML = `
    <div class="max-w-lg bg-orange-600 text-white p-3.5 rounded-2xl rounded-tr-none shadow-2xs space-y-1">
      <p>${val}</p>
      <span class="text-[10px] text-orange-200 block text-right">Just now</span>
    </div>
  `;
  stream.appendChild(msg);
  input.value = '';
  stream.scrollTop = stream.scrollHeight;
}

function handleSearch(val) {
  if (!val || val.trim().length < 3) return;
  // Search matches
  const match = currentPro.requests.find(r => r.project.toLowerCase().includes(val.toLowerCase())) ||
                currentPro.projects.find(p => p.name.toLowerCase().includes(val.toLowerCase()));
  if (match) {
    showToast(`Found: "${match.project || match.name}"`, 'info');
  }
}

function promptLogout() {
  const confirmBtn = document.getElementById('confirm-action-btn');
  document.getElementById('confirm-title').innerText = "Log out from BuildBid?";
  document.getElementById('confirm-msg').innerText = "You will be signed out from this desktop session.";
  confirmBtn.onclick = () => {
    closeModal('modal-confirm');
    showToast('Signed out successfully', 'info');
  };
  openModal('modal-confirm');
}

window.addEventListener('DOMContentLoaded', () => {
  // Populate notification dropdown initial content
  const notifList = document.getElementById('notif-list');
  if (notifList) {
    notifList.innerHTML = `
      <div class="p-3 hover:bg-slate-50 flex items-start space-x-2.5">
        <span class="w-2 h-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0"></span>
        <div>
          <p class="font-semibold text-slate-800">New Direct Lead Received</p>
          <p class="text-[11px] text-slate-500">Amit Kumar requested on-site inspection for Sector 44.</p>
          <span class="text-[10px] text-slate-400 mt-0.5 block">10 mins ago</span>
        </div>
      </div>
      <div class="p-3 hover:bg-slate-50 flex items-start space-x-2.5">
        <span class="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></span>
        <div>
          <p class="font-semibold text-slate-800">Escrow Milestone Released</p>
          <p class="text-[11px] text-slate-500">₹25,000 transferred for Greenfield Villa Phase 1 sign-off.</p>
          <span class="text-[10px] text-slate-400 mt-0.5 block">Yesterday, 5:20 PM</span>
        </div>
      </div>
    `;
  }

  navigate('dashboard');
});
