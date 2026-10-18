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

/* =========================================================
   UTILITIES: GREETING, DATE, ESCAPING & FALLBACK AVATAR
   ========================================================= */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getDynamicGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function getDynamicDateString() {
  const now = new Date();
  return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function updateLiveDate() {
  const el = document.getElementById('live-datetime');
  if (el) el.textContent = getDynamicDateString();
}

function isWorkScheduledDatePast(scheduledDateStr) {
  if (!scheduledDateStr) return false;
  if (typeof scheduledDateStr !== 'string' && typeof scheduledDateStr !== 'number' && !(scheduledDateStr instanceof Date)) {
    return false;
  }

  let sYear, sMonth, sDay;

  if (scheduledDateStr instanceof Date) {
    if (isNaN(scheduledDateStr.getTime())) return false;
    sYear = scheduledDateStr.getFullYear();
    sMonth = scheduledDateStr.getMonth();
    sDay = scheduledDateStr.getDate();
  } else if (typeof scheduledDateStr === 'number') {
    const d = new Date(scheduledDateStr);
    if (isNaN(d.getTime())) return false;
    sYear = d.getFullYear();
    sMonth = d.getMonth();
    sDay = d.getDate();
  } else {
    const raw = String(scheduledDateStr).trim();
    if (!raw || raw === '--' || raw === '-') return false;

    const lower = raw.toLowerCase();
    if (
      lower === 'flexible' ||
      lower === 'immediate' ||
      lower === 'tbd' ||
      lower === 'n/a' ||
      lower === 'na' ||
      lower === 'none' ||
      lower === 'pending' ||
      lower.includes('flexible') ||
      lower.includes('immediate') ||
      lower.includes('tbd')
    ) {
      return false;
    }

    const monthMap = {
      jan: 0, january: 0,
      feb: 1, february: 1,
      mar: 2, march: 2,
      apr: 3, april: 3,
      may: 4,
      jun: 5, june: 5,
      jul: 6, july: 6,
      aug: 7, august: 7,
      sep: 8, sept: 8, september: 8,
      oct: 9, october: 9,
      nov: 10, november: 10,
      dec: 11, december: 11
    };

    // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD
    const isoMatch = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      sYear = parseInt(isoMatch[1], 10);
      sMonth = parseInt(isoMatch[2], 10) - 1;
      sDay = parseInt(isoMatch[3], 10);
    }

    // 2. Day Month Year: e.g. "10 October 2026", "10 Oct 2026", "10th Oct 2026"
    if (sYear === undefined) {
      const dmyMatch = raw.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s,-]+([a-zA-Z]+)[\s,-]+(\d{4})/);
      if (dmyMatch) {
        const mKey = dmyMatch[2].toLowerCase();
        if (monthMap[mKey] !== undefined) {
          sDay = parseInt(dmyMatch[1], 10);
          sMonth = monthMap[mKey];
          sYear = parseInt(dmyMatch[3], 10);
        }
      }
    }

    // 3. Month Day Year: e.g. "October 10, 2026", "Oct 10, 2026"
    if (sYear === undefined) {
      const mdyMatch = raw.match(/^([a-zA-Z]+)[\s,-]+(\d{1,2})(?:st|nd|rd|th)?(?:,)?[\s,-]+(\d{4})/);
      if (mdyMatch) {
        const mKey = mdyMatch[1].toLowerCase();
        if (monthMap[mKey] !== undefined) {
          sMonth = monthMap[mKey];
          sDay = parseInt(mdyMatch[2], 10);
          sYear = parseInt(mdyMatch[3], 10);
        }
      }
    }

    // 4. Numeric DD-MM-YYYY or DD/MM/YYYY or MM/DD/YYYY
    if (sYear === undefined) {
      const numMatch = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      if (numMatch) {
        const p1 = parseInt(numMatch[1], 10);
        const p2 = parseInt(numMatch[2], 10);
        const y = parseInt(numMatch[3], 10);
        if (p1 > 12) {
          sDay = p1;
          sMonth = p2 - 1;
          sYear = y;
        } else if (p2 > 12) {
          sMonth = p1 - 1;
          sDay = p2;
          sYear = y;
        } else {
          sDay = p1;
          sMonth = p2 - 1;
          sYear = y;
        }
      }
    }

    // 5. Fallback safe Date parse
    if (sYear === undefined || isNaN(sYear) || sMonth === undefined || isNaN(sMonth) || sDay === undefined || isNaN(sDay)) {
      try {
        const parsed = new Date(raw);
        if (!isNaN(parsed.getTime())) {
          sYear = parsed.getFullYear();
          sMonth = parsed.getMonth();
          sDay = parsed.getDate();
        } else {
          return false;
        }
      } catch (_) {
        return false;
      }
    }
  }

  // Final sanity check on calendar units
  if (
    typeof sYear !== 'number' || isNaN(sYear) ||
    typeof sMonth !== 'number' || isNaN(sMonth) || sMonth < 0 || sMonth > 11 ||
    typeof sDay !== 'number' || isNaN(sDay) || sDay < 1 || sDay > 31
  ) {
    return false;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  if (sYear < currentYear) return true;
  if (sYear > currentYear) return false;
  if (sMonth < currentMonth) return true;
  if (sMonth > currentMonth) return false;
  return sDay < currentDay;
}

function getProfessionalFallbackAvatar(roleTitle) {
  return "professional-default-avatar.webp";
}

function normalizeProfessionalType(raw) {
  if (!raw || typeof raw !== 'string') return 'Professional';
  const val = raw.trim();
  if (!val) return 'Professional';
  const lower = val.toLowerCase().replace(/_/g, ' ');
  if (lower.includes('civil') || lower === 'engineer') return 'Civil Engineer';
  if (lower.includes('architect')) return 'Architect';
  if (lower.includes('interior')) return 'Interior Designer';
  if (lower.includes('electric')) return 'Electrician';
  if (lower.includes('plumb')) return 'Plumber';
  if (lower.includes('mason') || lower.includes('mistri')) return 'Mason / Mistri';
  if (lower.includes('carpent')) return 'Carpenter';
  if (lower.includes('contractor')) return 'Contractor';
  if (lower.includes('consult')) return 'Consultant';
  return val.charAt(0).toUpperCase() + val.slice(1);
}

/* DYNAMIC PROFESSIONAL DATA SCHEMA & DEFAULT TEMPLATES */
function createDefaultProfessional(name, type, location) {
  const resolvedType = normalizeProfessionalType(type);
  const resolvedName = (name && name.trim()) ? name.trim() : "Professional";
  const resolvedLocation = (location && location.trim()) ? location.trim() : "";

  return {
    id: "",
    name: resolvedName,
    type: resolvedType,
    category: resolvedType,
    location: resolvedLocation,
    pincode: "",
    serviceRadius: 25,
    rating: "—",
    reviewsCount: 0,
    experienceYears: 0,
    completedProjects: 0,
    avatar: getProfessionalFallbackAvatar(resolvedType),
    about: "",
    skills: [],
    isVerified: false,
    verificationStatus: "NOT_REQUIRED",
    stats: {
      newRequests: 0,
      activeProjects: 0,
      completedProjects: 0,
      upcomingWork: 0,
      totalEarnings: 0,
      pendingPayments: 0,
      profileViews: 0,
      responseRate: "—",
      completionRate: "—"
    },
    services: [],
    requests: [],
    projects: [],
    documents: []
  };
}

function getProCacheOwnerIdentifier() {
  try {
    const raw = localStorage.getItem("currentUser") || localStorage.getItem("marketplaceUser");
    if (!raw) return null;
    const u = JSON.parse(raw);
    const identifier = u.email || u.username || u.id;
    return identifier ? String(identifier).trim().toLowerCase() : null;
  } catch (e) {
    return null;
  }
}

function getValidProCachedAvatar() {
  try {
    const token = getCleanToken();
    if (!token) {
      localStorage.removeItem("buildbid_pro_avatar_cache");
      localStorage.removeItem("buildbid_pro_avatar_cache_owner");
      return null;
    }
    const currentOwner = getProCacheOwnerIdentifier();
    const storedOwner = localStorage.getItem("buildbid_pro_avatar_cache_owner");
    const cachedAvatar = localStorage.getItem("buildbid_pro_avatar_cache");
    if (!cachedAvatar) return null;
    if (!currentOwner || !storedOwner || currentOwner !== storedOwner.toLowerCase()) {
      localStorage.removeItem("buildbid_pro_avatar_cache");
      localStorage.removeItem("buildbid_pro_avatar_cache_owner");
      return null;
    }
    return cachedAvatar;
  } catch (e) {
    return null;
  }
}

function initializeCurrentProfessional() {
  let cachedUser = null;
  try {
    const raw = localStorage.getItem("currentUser") || localStorage.getItem("marketplaceUser");
    if (raw) cachedUser = JSON.parse(raw);
  } catch (e) { }

  const cachedAvatar = getValidProCachedAvatar();

  if (cachedUser) {
    const name = cachedUser.name || cachedUser.fullName || cachedUser.username || "Professional";
    const location = cachedUser.location || "";
    const rawType = cachedUser.category || cachedUser.profession || cachedUser.professionalType || cachedUser.type || "";
    const type = normalizeProfessionalType(rawType);
    const photoUrl = cachedUser.profilePhotoUrl || cachedUser.profilePhoto || cachedUser.avatarUrl || cachedUser.photoUrl || "";
    const pro = createDefaultProfessional(name, type, location);

    if (cachedAvatar) {
      pro.avatar = cachedAvatar;
    } else if (photoUrl && (photoUrl.startsWith("data:") || photoUrl.startsWith("blob:") || (photoUrl.startsWith("http") && !photoUrl.includes("images.unsplash.com")))) {
      pro.avatar = photoUrl;
    }

    if (cachedUser.id) pro.id = 'BBD-PRO-' + cachedUser.id;
    if (cachedUser.isVerified || cachedUser.verified || cachedUser.verificationStatus === 'VERIFIED') {
      pro.isVerified = true;
      pro.verificationStatus = 'VERIFIED';
    } else if (cachedUser.verificationStatus) {
      pro.verificationStatus = cachedUser.verificationStatus;
    }

    if (Array.isArray(cachedUser.documents)) pro.documents = cachedUser.documents;
    if (Array.isArray(cachedUser.requests)) pro.requests = cachedUser.requests;
    if (Array.isArray(cachedUser.projects)) pro.projects = cachedUser.projects;

    if (cachedUser.stats && typeof cachedUser.stats === 'object') {
      Object.assign(pro.stats, cachedUser.stats);
    } else {
      if (typeof cachedUser.totalEarnings === 'number') pro.stats.totalEarnings = cachedUser.totalEarnings;
      if (typeof cachedUser.pendingPayments === 'number') pro.stats.pendingPayments = cachedUser.pendingPayments;
      if (typeof cachedUser.activeProjects === 'number') pro.stats.activeProjects = cachedUser.activeProjects;
      if (typeof cachedUser.completedProjects === 'number') pro.stats.completedProjects = cachedUser.completedProjects;
    }

    if (cachedUser.rating !== undefined && cachedUser.rating !== null) pro.rating = cachedUser.rating;
    if (cachedUser.reviewsCount !== undefined && cachedUser.reviewsCount !== null) pro.reviewsCount = cachedUser.reviewsCount;

    return pro;
  }

  return createDefaultProfessional("Professional", "Professional", "");
}

const PERSONAS = {
  civil_engineer: {
    id: "BBD-CE-84920",
    name: "Professional",
    type: "Civil Engineer",
    category: "Structural Consultation & BOQ",
    location: "",
    pincode: "",
    serviceRadius: 25,
    rating: "—",
    reviewsCount: 0,
    experienceYears: 0,
    completedProjects: 0,
    avatar: getProfessionalFallbackAvatar("Civil Engineer"),
    about: "Licensed Civil & Structural Engineer specialized in RCC building audits, beam & column reinforcement detailing, BOQ estimation, and municipal building approvals.",
    skills: ["Structural Audit", "BOQ Estimation", "RCC Detailing", "AutoCAD", "Slump Testing", "Seismic Compliance"],
    isVerified: false,
    verificationStatus: "NOT_REQUIRED",
    stats: {
      newRequests: 0,
      activeProjects: 0,
      completedProjects: 0,
      upcomingWork: 0,
      totalEarnings: 0,
      pendingPayments: 0,
      profileViews: 0,
      responseRate: "—",
      completionRate: "—"
    },
    services: [],
    requests: [],
    projects: [],
    documents: []
  },

  interior_designer: {
    id: "BBD-ID-33910",
    name: "Professional",
    type: "Interior Designer",
    category: "Interior Architecture & Spatial Design",
    location: "",
    pincode: "",
    serviceRadius: 25,
    rating: "—",
    reviewsCount: 0,
    experienceYears: 0,
    completedProjects: 0,
    avatar: getProfessionalFallbackAvatar("Interior Designer"),
    about: "Spatial planning and interior architectural concepts for modern residences and boutique retail spaces.",
    skills: ["3D Rendering", "Modular Kitchens", "False Ceiling", "Lighting Design", "Material Curation", "Space Planning"],
    isVerified: false,
    verificationStatus: "NOT_REQUIRED",
    stats: {
      newRequests: 0,
      activeProjects: 0,
      completedProjects: 0,
      upcomingWork: 0,
      totalEarnings: 0,
      pendingPayments: 0,
      profileViews: 0,
      responseRate: "—",
      completionRate: "—"
    },
    services: [],
    requests: [],
    projects: [],
    documents: []
  },

  electrician: {
    id: "BBD-EL-19402",
    name: "Professional",
    type: "Electrician",
    category: "Electrical Contracting & Load Management",
    location: "",
    pincode: "",
    serviceRadius: 20,
    rating: "—",
    reviewsCount: 0,
    experienceYears: 0,
    completedProjects: 0,
    avatar: getProfessionalFallbackAvatar("Electrician"),
    about: "Licensed electrical contractor for residential wiring, DB dressing, earthing, and industrial load sanctioning.",
    skills: ["Concealed Wiring", "DB Dressing", "Earthing & Surge", "DG Synchronization", "LED Lighting", "Load Testing"],
    isVerified: false,
    verificationStatus: "NOT_REQUIRED",
    stats: {
      newRequests: 0,
      activeProjects: 0,
      completedProjects: 0,
      upcomingWork: 0,
      totalEarnings: 0,
      pendingPayments: 0,
      profileViews: 0,
      responseRate: "—",
      completionRate: "—"
    },
    services: [],
    requests: [],
    projects: [],
    documents: []
  },

  plumber: {
    id: "BBD-PL-67104",
    name: "Professional",
    type: "Plumber",
    category: "Sanitary, Drainage & Water Supply",
    location: "",
    pincode: "",
    serviceRadius: 15,
    rating: "—",
    reviewsCount: 0,
    experienceYears: 0,
    completedProjects: 0,
    avatar: getProfessionalFallbackAvatar("Plumber"),
    about: "Master plumbing technician specializing in CPVC/UPVC concealed pipefitting, pressure booster pumps, and water management.",
    skills: ["CPVC Concealed Piping", "Overhead Tank Boosters", "Sump Pump Systems", "Water Softeners", "Pressure Testing", "Drainage Grids"],
    isVerified: false,
    verificationStatus: "NOT_REQUIRED",
    stats: {
      newRequests: 0,
      activeProjects: 0,
      completedProjects: 0,
      upcomingWork: 0,
      totalEarnings: 0,
      pendingPayments: 0,
      profileViews: 0,
      responseRate: "—",
      completionRate: "—"
    },
    services: [],
    requests: [],
    projects: [],
    documents: []
  },

  mason: {
    id: "BBD-MS-48201",
    name: "Professional",
    type: "Mason / Mistri",
    category: "Brick Masonry, Plaster & Structural Labour",
    location: "",
    pincode: "",
    serviceRadius: 30,
    rating: "—",
    reviewsCount: 0,
    experienceYears: 0,
    completedProjects: 0,
    avatar: getProfessionalFallbackAvatar("Mason / Mistri"),
    about: "Experienced head mistri leading skilled masonry teams for red-brick masonry, AAC block laying, sand-face plastering, and RCC foundation casting.",
    skills: ["Red Brick Laying", "AAC Block Work", "External Sand Plaster", "Coping & Lintel Casting", "Waterproofing Plaster", "Plumb Line Precision"],
    isVerified: false,
    verificationStatus: "NOT_REQUIRED",
    stats: {
      newRequests: 0,
      activeProjects: 0,
      completedProjects: 0,
      upcomingWork: 0,
      totalEarnings: 0,
      pendingPayments: 0,
      profileViews: 0,
      responseRate: "—",
      completionRate: "—"
    },
    services: [],
    requests: [],
    projects: [],
    documents: []
  }
};

function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.location) {
    if (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8080';
    }
  }
  return 'https://buildbid-ap3j.onrender.com';
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

// ============================================================
// AUTHENTICATED PROFILE AVATAR MANAGEMENT & GLOBAL SYNCHRONIZATION
// ============================================================
let currentAvatarBlobUrl = null;
let avatarLoadRequestId = 0;
let activeAvatarFetchPromise = null;

function revokeCurrentAvatarBlobUrl() {
  if (currentAvatarBlobUrl && currentAvatarBlobUrl.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(currentAvatarBlobUrl);
    } catch (e) {
      console.warn('[BuildBid Pro] Error revoking avatar blob URL:', e);
    }
    currentAvatarBlobUrl = null;
  }
}

function updateAllAvatarElements(avatarUrl) {
  const fallbackUrl = getProfessionalFallbackAvatar(currentPro.type);
  const safeUrl = avatarUrl || fallbackUrl;
  currentPro.avatar = safeUrl;

  const sideAvatar = document.getElementById('side-avatar');
  if (sideAvatar) {
    sideAvatar.src = safeUrl;
    sideAvatar.onerror = function () {
      if (this.src !== fallbackUrl && !this.src.endsWith(fallbackUrl)) {
        this.src = fallbackUrl;
      } else {
        this.onerror = null;
      }
    };
  }

  const topAvatar = document.getElementById('top-avatar');
  if (topAvatar) {
    topAvatar.src = safeUrl;
    topAvatar.onerror = function () {
      if (this.src !== fallbackUrl && !this.src.endsWith(fallbackUrl)) {
        this.src = fallbackUrl;
      } else {
        this.onerror = null;
      }
    };
  }

  const heroAvatar = document.getElementById('proHeroAvatar');
  if (heroAvatar) {
    heroAvatar.src = safeUrl;
    heroAvatar.onerror = function () {
      if (this.src !== fallbackUrl && !this.src.endsWith(fallbackUrl)) {
        this.src = fallbackUrl;
      } else {
        this.onerror = null;
      }
    };
  }

  const profileAvatar = document.getElementById('proProfileTabAvatar');
  if (profileAvatar) {
    profileAvatar.src = safeUrl;
    profileAvatar.onerror = function () {
      if (this.src !== fallbackUrl && !this.src.endsWith(fallbackUrl)) {
        this.src = fallbackUrl;
      } else {
        this.onerror = null;
      }
    };
  }

  const settingsAvatar = document.getElementById('settings-header-avatar');
  if (settingsAvatar) {
    settingsAvatar.src = safeUrl;
    settingsAvatar.onerror = function () {
      if (this.src !== fallbackUrl && !this.src.endsWith(fallbackUrl)) {
        this.src = fallbackUrl;
      } else {
        this.onerror = null;
      }
    };
  }
}

async function loadAuthenticatedProfilePhoto(forceRefresh = false) {
  const token = getCleanToken();
  const fallbackUrl = getProfessionalFallbackAvatar(currentPro.type);

  if (!token) {
    revokeCurrentAvatarBlobUrl();
    try {
      localStorage.removeItem("buildbid_pro_avatar_cache");
      localStorage.removeItem("buildbid_pro_avatar_cache_owner");
    } catch (e) { }
    updateAllAvatarElements(fallbackUrl);
    return;
  }

  if (activeAvatarFetchPromise && !forceRefresh) {
    return activeAvatarFetchPromise;
  }

  const thisRequestId = ++avatarLoadRequestId;
  activeAvatarFetchPromise = (async () => {
    try {
      const fetchUrl = `${getApiBaseUrl()}/api/professional/profile/photo${forceRefresh ? '?t=' + Date.now() : ''}`;
      const res = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        },
        cache: 'no-cache'
      });

      if (thisRequestId !== avatarLoadRequestId) return;

      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) {
          console.warn('[BuildBid Pro] Non-image response for avatar:', contentType);
          revokeCurrentAvatarBlobUrl();
          updateAllAvatarElements(fallbackUrl);
          return;
        }

        const blob = await res.blob();
        if (thisRequestId !== avatarLoadRequestId) return;

        revokeCurrentAvatarBlobUrl();
        currentAvatarBlobUrl = URL.createObjectURL(blob);
        updateAllAvatarElements(currentAvatarBlobUrl);

        // Cache base64 in localStorage for zero-flash hydration across pages
        try {
          const reader = new FileReader();
          reader.onloadend = function () {
            if (reader.result) {
              try {
                localStorage.setItem("buildbid_pro_avatar_cache", reader.result);
                const owner = getProCacheOwnerIdentifier();
                if (owner) {
                  localStorage.setItem("buildbid_pro_avatar_cache_owner", owner);
                }
              } catch (e) { }
            }
          };
          reader.readAsDataURL(blob);
        } catch (e) { }
      } else if (res.status === 404) {
        revokeCurrentAvatarBlobUrl();
        try {
          localStorage.removeItem("buildbid_pro_avatar_cache");
          localStorage.removeItem("buildbid_pro_avatar_cache_owner");
        } catch (e) { }
        updateAllAvatarElements(fallbackUrl);
      } else if (res.status === 401 || res.status === 403) {
        console.warn('[BuildBid Pro] Unauthorized photo fetch (HTTP ' + res.status + ')');
        revokeCurrentAvatarBlobUrl();
        try {
          localStorage.removeItem("buildbid_pro_avatar_cache");
          localStorage.removeItem("buildbid_pro_avatar_cache_owner");
        } catch (e) { }
        updateAllAvatarElements(fallbackUrl);
      } else {
        if (!currentAvatarBlobUrl) {
          const cached = getValidProCachedAvatar();
          updateAllAvatarElements(cached || fallbackUrl);
        }
      }
    } catch (err) {
      if (thisRequestId !== avatarLoadRequestId) return;
      console.warn('[BuildBid Pro] Network error loading photo:', err);
      if (!currentAvatarBlobUrl) {
        const cached = getValidProCachedAvatar();
        updateAllAvatarElements(cached || fallbackUrl);
      }
    } finally {
      activeAvatarFetchPromise = null;
    }
  })();

  return activeAvatarFetchPromise;
}

// Global Avatar Synchronization Listener (in-window)
window.addEventListener('buildbid:avatar-sync', function (event) {
  const detail = event && event.detail ? event.detail : {};
  const photoUrl = detail.photoUrl;

  if (!photoUrl) {
    revokeCurrentAvatarBlobUrl();
    try {
      localStorage.removeItem("buildbid_pro_avatar_cache");
      localStorage.removeItem("buildbid_pro_avatar_cache_owner");
    } catch (e) { }
    updateAllAvatarElements(getProfessionalFallbackAvatar(currentPro.type));
    try {
      const raw = localStorage.getItem('currentUser');
      if (raw) {
        const u = JSON.parse(raw);
        delete u.profilePhotoUrl;
        delete u.profilePhoto;
        delete u.avatarUrl;
        localStorage.setItem('currentUser', JSON.stringify(u));
      }
    } catch (e) { }
  } else {
    loadAuthenticatedProfilePhoto(true);
  }
});

// Cross-tab synchronization listener (storage signal)
window.addEventListener('storage', function (e) {
  if (e.key === 'buildbid_avatar_sync_signal' && e.newValue) {
    try {
      const payload = JSON.parse(e.newValue);
      window.dispatchEvent(new CustomEvent('buildbid:avatar-sync', { detail: payload }));
    } catch (err) { }
  }
});

// Object URL garbage collection on unload
window.addEventListener('beforeunload', function () {
  revokeCurrentAvatarBlobUrl();
});

function applyProfessionalIdentity(name, location, type, photoUrl) {
  if (name && name.trim()) {
    currentPro.name = name.trim();
  }
  if (location !== undefined && location !== null) {
    currentPro.location = location.trim();
  }
  if (type && type.trim()) {
    currentPro.type = type.trim();
    currentPro.category = type.trim();
  } else if (!currentPro.type) {
    currentPro.type = 'Professional';
    currentPro.category = 'Professional';
  }

  // Profile image resolution:
  const cachedAvatar = getValidProCachedAvatar();
  const candidateUrl = (photoUrl || currentPro.profilePhotoUrl || currentPro.photoUrl || "").toString().trim();
  const isInvalidStock = !candidateUrl ||
    candidateUrl.includes("images.unsplash.com") ||
    candidateUrl.includes("placehold.co") ||
    candidateUrl.includes("via.placeholder");

  if (currentAvatarBlobUrl) {
    updateAllAvatarElements(currentAvatarBlobUrl);
  } else if (cachedAvatar) {
    updateAllAvatarElements(cachedAvatar);
    loadAuthenticatedProfilePhoto();
  } else if (!isInvalidStock && (candidateUrl === '/api/professional/profile/photo' || candidateUrl.startsWith('/api/'))) {
    updateAllAvatarElements(getProfessionalFallbackAvatar(currentPro.type));
    loadAuthenticatedProfilePhoto();
  } else if (!isInvalidStock && (candidateUrl.startsWith('data:') || candidateUrl.startsWith('blob:') || candidateUrl.startsWith('http'))) {
    updateAllAvatarElements(candidateUrl);
  } else {
    updateAllAvatarElements(getProfessionalFallbackAvatar(currentPro.type));
  }

  const sideBadge = document.getElementById('side-verified-badge');
  if (sideBadge) {
    sideBadge.classList.toggle('hidden', !(currentPro.isVerified || currentPro.verificationStatus === 'VERIFIED'));
  }

  const sideName = document.getElementById('side-name');
  if (sideName) sideName.innerText = currentPro.name;

  const sideRole = document.getElementById('side-role');
  if (sideRole) sideRole.innerText = currentPro.type;

  const sideLoc = document.getElementById('side-loc');
  if (sideLoc) sideLoc.innerText = currentPro.location || 'Location not specified';

  const topGreeting = document.getElementById('top-greeting');
  if (topGreeting) {
    const greeting = getDynamicGreeting();
    topGreeting.innerHTML = `${greeting}, ${escapeHtml(currentPro.name)} 👋`;
  }

  const topRoleBadge = document.getElementById('top-role-badge');
  if (topRoleBadge) topRoleBadge.innerText = currentPro.type;

  const topName = document.getElementById('top-name');
  if (topName) topName.innerText = currentPro.name;

  const menuName = document.getElementById('menu-name');
  if (menuName) menuName.innerText = currentPro.name;

  const menuId = document.getElementById('menu-id');
  if (menuId) menuId.innerText = currentPro.id ? `ID: ${currentPro.id}` : 'BuildBid Professional';

  const topSubtext = document.getElementById('top-subtext');
  if (topSubtext) {
    topSubtext.innerText = currentPro.type === 'Professional'
      ? 'Active for professional service consultations'
      : `Active for on-site ${currentPro.type.toLowerCase()} consultations`;
  }

  updateLiveDate();
}

function syncIdentityWithStoredSession() {
  let cachedUser = null;
  try {
    const raw = localStorage.getItem("currentUser") || localStorage.getItem("marketplaceUser");
    if (raw) cachedUser = JSON.parse(raw);
  } catch (e) { }

  if (cachedUser) {
    const name = cachedUser.name || cachedUser.fullName || cachedUser.username || "Professional";
    const location = cachedUser.location || "";
    const rawType = cachedUser.category || cachedUser.profession || cachedUser.professionalType || cachedUser.type || "";
    const type = normalizeProfessionalType(rawType);
    const photoUrl = cachedUser.profilePhotoUrl || "";

    const isVerified = Boolean(
      cachedUser.isVerified ||
      cachedUser.verified ||
      cachedUser.verificationStatus === 'VERIFIED'
    );
    currentPro.isVerified = isVerified;
    currentPro.verificationStatus = cachedUser.verificationStatus || (isVerified ? 'VERIFIED' : 'NOT_REQUIRED');

    if (Array.isArray(cachedUser.services)) currentPro.services = cachedUser.services;
    if (Array.isArray(cachedUser.documents)) currentPro.documents = cachedUser.documents;
    if (Array.isArray(cachedUser.requests)) currentPro.requests = cachedUser.requests;
    if (Array.isArray(cachedUser.projects)) currentPro.projects = cachedUser.projects;

    if (cachedUser.stats && typeof cachedUser.stats === 'object') {
      Object.assign(currentPro.stats, cachedUser.stats);
    } else {
      if (typeof cachedUser.totalEarnings === 'number') currentPro.stats.totalEarnings = cachedUser.totalEarnings;
      if (typeof cachedUser.pendingPayments === 'number') currentPro.stats.pendingPayments = cachedUser.pendingPayments;
      if (typeof cachedUser.activeProjects === 'number') currentPro.stats.activeProjects = cachedUser.activeProjects;
      if (typeof cachedUser.completedProjects === 'number') currentPro.stats.completedProjects = cachedUser.completedProjects;
    }

    if (cachedUser.rating !== undefined && cachedUser.rating !== null) currentPro.rating = cachedUser.rating;
    if (cachedUser.reviewsCount !== undefined && cachedUser.reviewsCount !== null) currentPro.reviewsCount = cachedUser.reviewsCount;

    applyProfessionalIdentity(name, location, type, photoUrl);
  } else {
    applyProfessionalIdentity(currentPro.name, currentPro.location, currentPro.type, "");
  }
  updateLiveDate();
}

async function fetchAndUpdateProfile() {
  const token = getCleanToken();
  if (!token) return;

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    if (res.ok) {
      const profile = await res.json();
      const name = profile.name || profile.fullName || profile.username || "";
      const location = profile.location || "";
      let cachedUser = null;
      try {
        const raw = localStorage.getItem("currentUser");
        if (raw) cachedUser = JSON.parse(raw);
      } catch (e) { }
      const rawType = (cachedUser && (cachedUser.category || cachedUser.profession || cachedUser.type)) || profile.category || profile.profession || profile.type || "";
      const type = normalizeProfessionalType(rawType);
      const photoUrl = profile.profilePhotoUrl || "";

      const isVerified = Boolean(
        profile.verified ||
        profile.isVerified ||
        profile.verificationStatus === 'VERIFIED' ||
        (cachedUser && (cachedUser.isVerified || cachedUser.verified || cachedUser.verificationStatus === 'VERIFIED'))
      );
      currentPro.isVerified = isVerified;
      currentPro.verificationStatus = profile.verificationStatus || (isVerified ? 'VERIFIED' : 'NOT_REQUIRED');

      applyProfessionalIdentity(name, location, type, photoUrl);

      if (!photoUrl && currentAvatarBlobUrl) {
        revokeCurrentAvatarBlobUrl();
        updateAllAvatarElements(getProfessionalFallbackAvatar(currentPro.type));
      }

      // Load services to check for real verification and documents
      try {
        const sRes = await fetch(`${getApiBaseUrl()}/api/professional/services`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        if (sRes.ok) {
          const sList = await sRes.json();
          if (Array.isArray(sList)) {
            currentPro.services = sList;
            updateProHeroServicesUI(sList);
            try {
              const raw = localStorage.getItem("currentUser");
              if (raw) {
                const u = JSON.parse(raw);
                u.services = sList;
                localStorage.setItem("currentUser", JSON.stringify(u));
              }
            } catch (e) { }
            if (sList.length > 0) {
              const liveDocs = [];
              let anyVerified = false;
              sList.forEach(s => {
                if (s.verificationStatus === 'VERIFIED') anyVerified = true;
                if (s.licenseNumber || s.qualificationTitle || s.documentName) {
                  liveDocs.push({
                    title: s.qualificationTitle || s.serviceTitleEn || 'Professional Credential',
                    issuer: s.issuingAuthority || 'Regulatory Board',
                    idNumber: s.licenseNumber ? `LIC-••••-${s.licenseNumber.slice(-4)}` : 'On file',
                    status: s.verificationStatus || 'PENDING',
                    date: s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recent'
                  });
                }
              });
              if (anyVerified) {
                currentPro.isVerified = true;
                currentPro.verificationStatus = 'VERIFIED';
              }
              if (liveDocs.length > 0) {
                currentPro.documents = liveDocs;
              }
            }
          }
        }
      } catch (sErr) {
        console.warn("Could not fetch professional services for credentials:", sErr);
      }

      // Re-render active route view with fresh values
      navigate(activeRoute);
    }
  } catch (err) {
    console.warn("Could not fetch profile from backend:", err);
  }
}

let isRequestsLoading = false;
let requestsFetchError = null;
let activeRequestTab = 'DIRECT_HIRE'; // 'DIRECT_HIRE' or 'POST_REQUIREMENT'
let requestStatusFilter = 'ALL'; // 'ALL', 'NEW', 'ACCEPTED', 'DECLINED'
let requestSearchQuery = '';

function setRequestsTab(tab) {
  activeRequestTab = tab;
  const container = document.getElementById('main-view');
  if (container && activeRoute === 'requests') {
    renderRequests(container);
  }
}

function setRequestsStatusFilter(filter) {
  requestStatusFilter = filter;
  const container = document.getElementById('main-view');
  if (container && activeRoute === 'requests') {
    renderRequests(container);
  }
}

function handleRequestSearch(query) {
  requestSearchQuery = (query || '').trim().toLowerCase();
  const container = document.getElementById('main-view');
  if (container && activeRoute === 'requests') {
    renderRequests(container);
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatRequesterRole(role) {
  if (!role) return 'Customer';
  const r = String(role).toUpperCase().replace('ROLE_', '').trim();
  if (r === 'CUSTOMER') return 'Customer';
  if (r === 'CONTRACTOR') return 'Contractor';
  if (r === 'MATERIAL_SELLER' || r === 'SELLER') return 'Material Seller';
  if (r === 'PROFESSIONAL' || r === 'SERVICE_PROVIDER') return 'Professional';
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

function getRequesterRoleBadge(role) {
  const r = String(role || 'CUSTOMER').toUpperCase().replace('ROLE_', '').trim();
  if (r === 'CONTRACTOR') {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80"><i class="fa-solid fa-hard-hat text-[9px]"></i> Contractor</span>`;
  } else if (r === 'MATERIAL_SELLER' || r === 'SELLER') {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80"><i class="fa-solid fa-boxes-stacked text-[9px]"></i> Material Seller</span>`;
  }
  return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80"><i class="fa-solid fa-user text-[9px]"></i> Customer</span>`;
}

function getRequestStatusBadge(status) {
  const s = String(status || 'New').trim().toLowerCase();
  if (s === 'new') {
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200"><span class="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span> New Request</span>`;
  }
  if (s === 'accepted') {
    return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200"><i class="fa-solid fa-check text-[9px]"></i> Accepted</span>`;
  }
  if (s === 'declined') {
    return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200"><i class="fa-solid fa-xmark text-[9px]"></i> Declined</span>`;
  }
  return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">${escapeHtml(status)}</span>`;
}

function getRequestTypeBadge(type) {
  return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80"><i class="fa-solid fa-handshake text-[9px]"></i> Direct Hire</span>`;
}

function updateSidebarRequestBadge(count) {
  const badge = document.getElementById('side-req-badge');
  if (badge) {
    const val = typeof count === 'number' ? count : ((currentPro && currentPro.requests) ? currentPro.requests.length : 0);
    badge.innerText = val;
  }
}

async function fetchAndUpdateRequests() {
  const token = getCleanToken();
  if (!token) {
    updateSidebarRequestBadge(0);
    requestsFetchError = 'Please log in to view client requests.';
    if (activeRoute === 'requests') {
      const container = document.getElementById('main-view');
      if (container) renderRequests(container);
    }
    return;
  }

  isRequestsLoading = true;
  requestsFetchError = null;

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/professional/requests`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    isRequestsLoading = false;

    if (res.ok) {
      const backendRequests = await res.json();
      if (Array.isArray(backendRequests)) {
        currentPro.requests = backendRequests.map(req => {
          const reqId = req.requestId || req.id || ('REQ-' + (req.numericId || ''));
          const rType = (req.requestType || 'DIRECT_HIRE').toUpperCase();
          const rawBudget = (req.clientBudget !== undefined && req.clientBudget !== null) ? req.clientBudget : req.rawBudget;
          let formattedBudget = '--';
          if (typeof rawBudget === 'number' && rawBudget > 0) {
            formattedBudget = '₹' + rawBudget.toLocaleString('en-IN');
          } else if (req.budget) {
            formattedBudget = req.budget;
          }

          return {
            id: reqId,
            requestId: reqId,
            numericId: req.numericId,
            requestType: rType,
            requestStatus: req.requestStatus || req.status || 'New',
            status: req.requestStatus || req.status || 'New',

            // Requester info
            requesterUserId: req.requesterUserId || null,
            requesterName: req.requesterName || req.customer || 'Client',
            customer: req.requesterName || req.customer || 'Client',
            requesterRole: req.requesterRole || req.requesterType || 'CUSTOMER',
            requesterPhone: req.requesterPhone || '',
            requesterLocation: req.requesterLocation || req.location || '',

            // Project & Service info
            service: req.requestedService || req.service || currentPro.type || 'Service',
            requestedService: req.requestedService || req.service || currentPro.type || 'Service',
            project: req.projectName || req.project || 'Direct Hire Engagement',
            projectName: req.projectName || req.project || 'Direct Hire Engagement',
            projectScope: req.projectScope || req.desc || '',
            desc: req.projectScope || req.desc || '',

            // Location & Schedule
            location: req.location || req.requesterLocation || currentPro.location || '',
            distance: req.distance || '',
            date: req.date || req.targetDate || '--',

            // Budget
            clientBudget: rawBudget,
            rawBudget: rawBudget,
            budget: formattedBudget,

            // Ownership & Metadata
            professionalId: req.professionalId || null,
            createdAt: req.createdAt || null,
            time: req.time || ''
          };
        });

        updateSidebarRequestBadge(currentPro.requests.length);
        if (currentPro && currentPro.stats) {
          currentPro.stats.newRequests = currentPro.requests.filter(r => (r.status || '').toLowerCase() === 'new').length;
          const statElem = document.getElementById('stat-new-requests');
          if (statElem) statElem.innerText = currentPro.stats.newRequests;
        }
      }
    } else if (res.status === 401) {
      requestsFetchError = 'Session expired. Please log in again to view your requests.';
      updateSidebarRequestBadge(0);
    } else if (res.status === 403) {
      requestsFetchError = 'Access denied. Only registered professionals can view this console.';
      updateSidebarRequestBadge(0);
    } else {
      requestsFetchError = `Unable to fetch requests from server (Status ${res.status}).`;
      console.warn("Could not fetch requests from backend, status:", res.status);
    }
  } catch (err) {
    isRequestsLoading = false;
    requestsFetchError = 'Network error: Could not connect to backend server.';
    console.warn("Could not fetch requests from backend:", err);
  }

  if (activeRoute === 'requests' || activeRoute === 'dashboard') {
    const container = document.getElementById('main-view');
    if (container) {
      if (activeRoute === 'requests') renderRequests(container);
      else if (activeRoute === 'dashboard') renderDashboard(container);
    }
  }
}

let isActiveWorksLoading = false;
let activeWorksFetchError = null;

async function fetchAndUpdateActiveWorks() {
  const token = getCleanToken();
  if (!token) {
    currentPro.projects = [];
    if (activeRoute === 'projects') {
      const container = document.getElementById('main-view');
      if (container) renderProjects(container);
    } else if (activeRoute === 'dashboard') {
      const container = document.getElementById('main-view');
      if (container) renderDashboard(container);
    }
    return;
  }

  isActiveWorksLoading = true;
  activeWorksFetchError = null;

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/professional/active-works`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    isActiveWorksLoading = false;

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        currentPro.projects = data.map(item => {
          let displayBudget = item.budget;
          if (typeof displayBudget === 'number' && displayBudget > 0) {
            displayBudget = '₹' + displayBudget.toLocaleString('en-IN');
          } else if (displayBudget && !String(displayBudget).trim().startsWith('₹')) {
            displayBudget = '₹' + displayBudget;
          }

          return {
            id: item.id || '',
            name: item.name || 'Active Work',
            customer: item.customer || 'Client',
            service: item.service || currentPro.type || 'Professional Service',
            budget: displayBudget || '--',
            status: item.status || 'Active',
            progress: typeof item.progress === 'number' ? item.progress : 25,
            nextMilestone: item.nextMilestone || 'Drawings & BOQ',
            start: item.start || '--',
            scheduledDate: item.scheduledDate || null,
            deadline: item.deadline || '--',
            source: item.source || 'POST_REQUIREMENT'
          };
        });
      } else {
        currentPro.projects = [];
      }
    } else {
      console.warn("Could not fetch active works from backend, status:", res.status);
      currentPro.projects = [];
    }
  } catch (err) {
    isActiveWorksLoading = false;
    activeWorksFetchError = 'Network error: Could not connect to backend server.';
    console.warn("Could not fetch active works from backend:", err);
  }

  if (activeRoute === 'projects') {
    const container = document.getElementById('main-view');
    if (container) renderProjects(container);
  } else if (activeRoute === 'dashboard') {
    const container = document.getElementById('main-view');
    if (container) renderDashboard(container);
  }
}

function executeLogout() {
  localStorage.removeItem("marketplaceToken");
  localStorage.removeItem("token");
  localStorage.removeItem("authToken");
  localStorage.removeItem("marketplaceUser");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("customerUser");
  localStorage.removeItem("buildbid_user");
  localStorage.removeItem("buildbid_current_user");
  localStorage.removeItem("buildbid_pro_avatar_cache");
  localStorage.removeItem("buildbid_pro_avatar_cache_owner");
  sessionStorage.removeItem("pendingRedirect");
  sessionStorage.removeItem("userData");
  sessionStorage.removeItem("currentUser");
  sessionStorage.removeItem("token");
  sessionStorage.clear();
  showLogoutToast(() => {
    window.location.href = "index.html";
  });
}

function getInitialPersonaKey() {
  try {
    const raw = localStorage.getItem("currentUser") || localStorage.getItem("marketplaceUser");
    if (raw) {
      const u = JSON.parse(raw);
      const cat = (u.category || u.profession || u.professionalType || u.type || "").toLowerCase();
      if (cat.includes("interior")) return "interior_designer";
      if (cat.includes("electric")) return "electrician";
      if (cat.includes("plumb")) return "plumber";
      if (cat.includes("mason") || cat.includes("mistri")) return "mason";
    }
  } catch (e) { }
  return "civil_engineer";
}

let activePersonaKey = getInitialPersonaKey();
let activeRoute = 'dashboard';
let currentPro = initializeCurrentProfessional();
syncIdentityWithStoredSession();

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
  const isOpening = el.classList.contains('hidden');
  el.classList.toggle('hidden');
  document.getElementById('user-menu').classList.add('hidden');
  if (isOpening) {
    fetchAndUpdateNotifications();
  }
}

function escapeProHTML(str) {
  if (!str) return "";
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

function formatProNotifTime(dateStr) {
  if (!dateStr) return "Just now";
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (isNaN(diffMs) || diffMs < 0) return "Just now";
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  } catch (e) {
    return "Recently";
  }
}

async function fetchAndUpdateNotifications() {
  const token = getCleanToken();
  const notifList = document.getElementById('notif-list');
  const notifDot = document.getElementById('pro-notif-dot');
  const notifTitle = document.getElementById('pro-notif-title');

  if (!token) {
    if (notifList) notifList.innerHTML = '<div class="p-4 text-center text-slate-400">Please log in to view notifications</div>';
    if (notifDot) notifDot.classList.add('hidden');
    return;
  }

  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/notifications`, {
      method: "GET",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) {
      if (notifList) notifList.innerHTML = '<div class="p-4 text-center text-slate-400">Unable to load notifications</div>';
      return;
    }

    const data = await res.json();
    const notifs = data.notifications || [];
    const unreadCount = data.unreadCount || 0;

    // Update unread indicator dot
    if (notifDot) {
      if (unreadCount > 0) notifDot.classList.remove('hidden');
      else notifDot.classList.add('hidden');
    }

    // Update header
    if (notifTitle) {
      notifTitle.textContent = `Notifications / सूचनाएं ${unreadCount > 0 ? '(' + unreadCount + ' New)' : ''}`;
    }

    if (!notifList) return;

    if (notifs.length === 0) {
      notifList.innerHTML = `
        <div class="p-6 text-center text-slate-400">
          <i class="fa-regular fa-bell-slash text-2xl mb-1 text-slate-300 block"></i>
          No notifications yet / अभी कोई सूचना नहीं है
        </div>
      `;
      return;
    }

    notifList.innerHTML = notifs.map(n => {
      const isUnread = !n.isRead;
      const type = (n.type || "").toUpperCase();
      let iconColor = "bg-orange-500";
      if (type.includes("ORDER") || type.includes("PAYMENT")) iconColor = "bg-emerald-500";
      else if (type.includes("REQUEST") || type.includes("LEAD")) iconColor = "bg-blue-500";
      else if (type.includes("POST_REQUIREMENT_ACCEPTED")) iconColor = "bg-green-500";
      else if (type.includes("POST_REQUIREMENT_REJECTED")) iconColor = "bg-rose-500";
      else if (type.includes("POST_REQUIREMENT_MATCH")) iconColor = "bg-amber-500";

      return `
        <div class="p-3 hover:bg-slate-50 flex items-start space-x-2.5 cursor-pointer transition ${isUnread ? 'bg-orange-50/30' : ''}"
             onclick="handleProNotificationClick(${n.id}, '${escapeProHTML(n.type || '')}', '${escapeProHTML(n.referenceId || '')}', ${isUnread})">
          <span class="w-2 h-2 rounded-full ${iconColor} mt-1.5 flex-shrink-0"></span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <p class="font-semibold text-slate-800 truncate">${escapeProHTML(n.title || '')}</p>
              ${isUnread ? '<span class="w-2 h-2 rounded-full bg-orange-600 flex-shrink-0 ml-1"></span>' : ''}
            </div>
            ${n.titleHi ? `<p class="text-[11px] font-medium text-slate-600 truncate">${escapeProHTML(n.titleHi)}</p>` : ''}
            <p class="text-[11px] text-slate-500 mt-0.5 line-clamp-2">${escapeProHTML(n.message || '')}</p>
            ${n.messageHi ? `<p class="text-[10px] text-slate-400 mt-0.5 line-clamp-2">${escapeProHTML(n.messageHi)}</p>` : ''}
            <span class="text-[10px] text-slate-400 mt-1 block">${formatProNotifTime(n.createdAt)}</span>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error("Pro notifications error:", err);
    if (notifList) notifList.innerHTML = '<div class="p-4 text-center text-slate-400">Error loading notifications</div>';
  }
}

async function handleProNotificationClick(notifId, type, refId, isUnread) {
  const el = document.getElementById('notif-dropdown');
  if (el) el.classList.add('hidden');

  if (isUnread && notifId) {
    try {
      const baseUrl = getApiBaseUrl();
      const token = getCleanToken();
      await fetch(`${baseUrl}/api/notifications/${notifId}/read`, {
        method: "PUT",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        }
      });
      fetchAndUpdateNotifications();
    } catch (e) {
      console.warn("Could not mark notif read:", e);
    }
  }

  const t = (type || "").toUpperCase();
  if (t === "POST_REQUIREMENT_MATCH" || t.includes("POST_REQUIREMENT_MATCH")) {
    navigate('find-work');
  } else if (t === "POST_REQUIREMENT_ACCEPTED" || t.includes("POST_REQUIREMENT_ACCEPTED")) {
    navigate('requests');
  } else if (t === "POST_REQUIREMENT_REJECTED" || t.includes("POST_REQUIREMENT_REJECTED")) {
    navigate('find-work');
  } else if (t === "POST_REQUIREMENT_APPLICATION" || t.includes("POST_REQUIREMENT_APPLICATION")) {
    window.location.href = `requirement-applications.html${refId ? '?applicationId=' + encodeURIComponent(refId) : ''}`;
  } else if (t.includes("ORDER") || t.includes("DIRECT_BUY")) {
    navigate('my-orders');
  } else if (t.includes("REQUEST") || t.includes("LEAD") || t.includes("QUOTATION")) {
    navigate('requests');
  } else if (t.includes("PROJECT")) {
    navigate('projects');
  } else {
    navigate('dashboard');
  }
}

async function markAllProNotificationsRead() {
  const token = getCleanToken();
  if (!token) return;

  try {
    const baseUrl = getApiBaseUrl();
    await fetch(`${baseUrl}/api/notifications/mark-all-read`, {
      method: "PUT",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      }
    });
    showToast("All notifications marked as read / सभी सूचनाएं पढ़ी गईं", "success");
    fetchAndUpdateNotifications();
  } catch (err) {
    console.error("Pro mark all read error:", err);
    showToast("Error marking notifications as read", "error");
  }
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

  // Ensure dynamic identity is preserved
  syncIdentityWithStoredSession();

  // Update Sidebar & Header Elements
  const sideSelect = document.getElementById('sidebar-role-select');
  if (sideSelect) sideSelect.value = newKey;
  const sideName = document.getElementById('side-name');
  if (sideName) sideName.innerText = currentPro.name;
  const sideRole = document.getElementById('side-role');
  if (sideRole) sideRole.innerText = currentPro.type;
  const sideLoc = document.getElementById('side-loc');
  if (sideLoc) sideLoc.innerText = currentPro.location || 'Location not specified';
  const sideBadge = document.getElementById('side-verified-badge');
  if (sideBadge) {
    sideBadge.classList.toggle('hidden', !(currentPro.isVerified || currentPro.verificationStatus === 'VERIFIED'));
  }
  updateAllAvatarElements(currentPro.avatar);

  const topGreeting = document.getElementById('top-greeting');
  if (topGreeting) topGreeting.innerHTML = `${getDynamicGreeting()}, ${escapeHtml(currentPro.name)} 👋`;
  const topRoleBadge = document.getElementById('top-role-badge');
  if (topRoleBadge) topRoleBadge.innerText = currentPro.type;
  const topName = document.getElementById('top-name');
  if (topName) topName.innerText = currentPro.name;
  const menuName = document.getElementById('menu-name');
  if (menuName) menuName.innerText = currentPro.name;
  const menuId = document.getElementById('menu-id');
  if (menuId) menuId.innerText = currentPro.id ? `ID: ${currentPro.id}` : 'BuildBid Professional';

  updateLiveDate();

  // Re-render the current view
  const container = document.getElementById('main-view');
  if (container) {
    navigate(activeRoute);
  }
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
      fetchFindWorkRequirements();
      break;
    case 'requests':
      renderRequests(container);
      fetchAndUpdateRequests();
      break;
    case 'projects':
      renderProjects(container);
      fetchAndUpdateActiveWorks();
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
    case 'settings':
    case 'account-settings':
      window.location.href = 'professional-account-setting.html';
      break;
    case 'my-requests':
      renderProfessionalMyRequests(container);
      fetchProfessionalRequests();
      break;
    case 'my-orders':
      renderProfessionalMyOrders(container);
      fetchProfessionalOrders();
      break;
    case 'buy-material':
      window.location.href = 'buy-material-select.html';
      break;
    default:
      renderDashboard(container);
  }

  try {
    if (window.location.hash !== '#' + route) {
      window.history.replaceState(null, '', '#' + route);
    }
  } catch (e) { }

  container.scrollTop = 0;
}

function getHeroVerificationBadgeHtml(pro) {
  if (pro.isVerified || pro.verificationStatus === 'VERIFIED') {
    return `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
        <i class="fa-solid fa-circle-check text-[10px]"></i> Verified Professional
      </span>
    `;
  } else if (pro.verificationStatus === 'PENDING') {
    return `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
        <i class="fa-solid fa-clock text-[10px]"></i> Verification In Review
      </span>
    `;
  } else {
    return `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-slate-200 border border-white/20">
        <i class="fa-solid fa-user-check text-[10px]"></i> Professional Account
      </span>
    `;
  }
}

function getHeroVerificationBadgeHtml(pro) {
  if (pro.isVerified || pro.verificationStatus === 'VERIFIED') {
    return `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
        <i class="fa-solid fa-circle-check text-[10px]"></i> Verified Professional
      </span>
    `;
  } else if (pro.verificationStatus === 'PENDING') {
    return `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
        <i class="fa-solid fa-clock text-[10px]"></i> Verification In Review
      </span>
    `;
  } else {
    return `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-slate-200 border border-white/20">
        <i class="fa-solid fa-user-check text-[10px]"></i> Professional Account
      </span>
    `;
  }
}

function renderProHeroServicesHtml(services) {
  const list = Array.isArray(services) ? services : [];
  const pillsHtml = list.map(s => {
    const title = (s.serviceTitleEn || s.name || s.title || '').trim();
    if (!title) return '';
    return `<span class="pro-service-pill" title="${escapeHtml(title)}">${escapeHtml(title)}</span>`;
  }).filter(Boolean).join('');

  if (!pillsHtml) {
    return `
      <div class="pro-hero-services-section" id="proHeroServicesSection">
        <span class="pro-services-label" title="My Service Catalog">
          <i class="fa-solid fa-briefcase"></i> <span>Services:</span>
        </span>
        <span class="pro-services-empty">No services added to catalog yet</span>
      </div>
    `;
  }

  return `
    <div class="pro-hero-services-section" id="proHeroServicesSection">
      <span class="pro-services-label" title="My Service Catalog">
        <i class="fa-solid fa-briefcase"></i> <span>Services:</span>
      </span>
      <div class="pro-services-pills">
        ${pillsHtml}
      </div>
    </div>
  `;
}

function updateProHeroServicesUI(services) {
  const sec = document.getElementById('proHeroServicesSection');
  if (!sec) return;
  const list = Array.isArray(services) ? services : [];
  const pillsHtml = list.map(s => {
    const title = (s.serviceTitleEn || s.name || s.title || '').trim();
    if (!title) return '';
    return `<span class="pro-service-pill" title="${escapeHtml(title)}">${escapeHtml(title)}</span>`;
  }).filter(Boolean).join('');

  if (!pillsHtml) {
    sec.innerHTML = `
      <span class="pro-services-label" title="My Service Catalog">
        <i class="fa-solid fa-briefcase"></i> <span>Services:</span>
      </span>
      <span class="pro-services-empty">No services added to catalog yet</span>
    `;
  } else {
    sec.innerHTML = `
      <span class="pro-services-label" title="My Service Catalog">
        <i class="fa-solid fa-briefcase"></i> <span>Services:</span>
      </span>
      <div class="pro-services-pills">
        ${pillsHtml}
      </div>
    `;
  }
}

function renderDashboard(container) {
  const displayRole = (currentPro.type && currentPro.type.trim()) ? escapeHtml(currentPro.type) : 'Professional';
  const displayLoc = (currentPro.location && currentPro.location.trim()) ? escapeHtml(currentPro.location) : 'Location not specified';
  const locArea = (currentPro.location && currentPro.location.trim()) ? escapeHtml(currentPro.location.split(',')[0].trim()) : 'your service';

  // Real request counts
  const reqCount = (currentPro.requests && Array.isArray(currentPro.requests)) ? currentPro.requests.length : 0;

  // Real stats
  const pendingEscrow = typeof currentPro.stats?.pendingPayments === 'number' ? currentPro.stats.pendingPayments : 0;
  const totalEarnings = typeof currentPro.stats?.totalEarnings === 'number' ? currentPro.stats.totalEarnings : 0;
  const activePrjCount = typeof currentPro.stats?.activeProjects === 'number'
    ? currentPro.stats.activeProjects
    : (Array.isArray(currentPro.projects) ? currentPro.projects.filter(p => p.status === 'Active').length : 0);
  const completedPrjCount = typeof currentPro.stats?.completedProjects === 'number'
    ? currentPro.stats.completedProjects
    : (Array.isArray(currentPro.projects) ? currentPro.projects.filter(p => p.status === 'Completed').length : 0);

  // Credentials / Documents logic for Card 1
  const hasDocs = Array.isArray(currentPro.documents) && currentPro.documents.length > 0;
  const isVerifiedAccount = Boolean(currentPro.isVerified || currentPro.verificationStatus === 'VERIFIED');
  const isPendingAccount = currentPro.verificationStatus === 'PENDING';

  let card1StatusBadge = '';
  let card1Subtitle = '';
  if (isVerifiedAccount) {
    card1StatusBadge = '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">Verified</span>';
    card1Subtitle = 'Authenticated Record';
  } else if (isPendingAccount) {
    card1StatusBadge = '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">In Review</span>';
    card1Subtitle = 'Verification Pending';
  } else {
    card1StatusBadge = '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">Standard</span>';
    card1Subtitle = 'Profile & Licensing';
  }

  let card1DetailsHtml = '';
  if (hasDocs) {
    const doc1 = currentPro.documents[0];
    const doc2 = currentPro.documents[1];
    card1DetailsHtml = `
      <div class="space-y-1.5 my-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
        <div class="flex items-center justify-between text-slate-600">
          <span class="flex items-center gap-1.5 truncate mr-2"><i class="fa-solid fa-file-contract text-emerald-600 text-[11px]"></i> ${escapeHtml(doc1.title || 'Credential')}:</span>
          <strong class="text-slate-800 font-mono text-[11px] flex-shrink-0">${escapeHtml(doc1.idNumber || doc1.status || 'On File')}</strong>
        </div>
        ${doc2 ? `
          <div class="flex items-center justify-between text-slate-600">
            <span class="flex items-center gap-1.5 truncate mr-2"><i class="fa-solid fa-stamp text-emerald-600 text-[11px]"></i> ${escapeHtml(doc2.title || 'License')}:</span>
            <strong class="text-slate-800 font-mono text-[11px] flex-shrink-0">${escapeHtml(doc2.idNumber || doc2.status || 'On File')}</strong>
          </div>
        ` : `
          <div class="flex items-center justify-between text-slate-600">
            <span class="flex items-center gap-1.5"><i class="fa-solid fa-shield-check text-sky-600 text-[11px]"></i> Status:</span>
            <strong class="text-slate-800">${escapeHtml(doc1.status || 'Active')}</strong>
          </div>
        `}
      </div>
    `;
  } else {
    card1DetailsHtml = `
      <div class="space-y-1.5 my-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
        <div class="flex items-center justify-between text-slate-600">
          <span class="flex items-center gap-1.5"><i class="fa-solid fa-id-card text-slate-400 text-[11px]"></i> Identity Record:</span>
          <strong class="text-slate-500 font-normal">Not uploaded</strong>
        </div>
        <div class="flex items-center justify-between text-slate-600">
          <span class="flex items-center gap-1.5"><i class="fa-solid fa-stamp text-slate-400 text-[11px]"></i> Trade License:</span>
          <strong class="text-slate-500 font-normal">Not on file</strong>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="space-y-7 max-w-[1700px] mx-auto">
      <!-- PROFESSIONAL PROFILE HERO CARD (Custom Hero Background) -->
      <section class="pro-profile-hero-banner mb-6">
        <div class="pro-hero-left">
          <div class="pro-hero-avatar-box">
            <img src="${escapeHtml(currentPro.avatar)}" alt="${escapeHtml(currentPro.name)}" class="pro-hero-avatar" id="proHeroAvatar" onerror="if (this.src !== getProfessionalFallbackAvatar(currentPro.type) && !this.src.endsWith(getProfessionalFallbackAvatar(currentPro.type))) { this.src = getProfessionalFallbackAvatar(currentPro.type); } else { this.onerror = null; }">
          </div>
          
          <div class="pro-hero-details">
            <div class="pro-hero-title-row">
              <h2 class="pro-hero-name">
                ${getDynamicGreeting()}, <span class="pro-hero-name-highlight">${escapeHtml(currentPro.name)}</span>
              </h2>
              ${isVerifiedAccount
      ? '<i class="fa-solid fa-circle-check pro-badge-verified" title="Verified Professional Account"></i>'
      : ''}
            </div>

            ${isVerifiedAccount
      ? '<div class="pro-vip-tag" id="proMembershipBadge"><i class="fa-solid fa-crown text-amber-500"></i> <span>Verified Service Partner</span></div>'
      : (isPendingAccount
        ? '<div class="pro-vip-tag" id="proMembershipBadge"><i class="fa-solid fa-clock text-amber-500"></i> <span>Verification In Review</span></div>'
        : '')}

            <p class="pro-hero-role">PROFESSIONAL · BUILDBID</p>

            <div class="pro-hero-meta-items">
              <span title="Operational Location">
                <i class="fa-solid fa-location-dot"></i> <span>${displayLoc}</span>
              </span>
              <span>
                <i class="fa-regular fa-calendar"></i> <span>Member since 2026</span>
              </span>
              <span title="Operational Service Radius">
                <i class="fa-solid fa-crosshairs"></i> <span>${currentPro.serviceRadius || 25} km Service Area</span>
              </span>
            </div>

            ${renderProHeroServicesHtml(currentPro.services)}
          </div>
        </div>
      </section>

      <!-- 8 DESKTOP STATS CARDS GRID -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div onclick="navigate('requests')" class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:border-orange-300 transition pro-stat-card cursor-pointer">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-semibold">New Work Requests</span>
            <span class="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-xs">
              <i class="fa-solid fa-inbox"></i>
            </span>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-3xl font-extrabold text-slate-900">${currentPro.stats?.newRequests ?? 0}</span>
            ${(currentPro.stats?.newRequests ?? 0) > 0
      ? '<span class="text-xs font-bold text-emerald-600">Active</span>'
      : '<span class="text-xs font-bold text-slate-400">None pending</span>'}
          </div>
          <p class="text-[11px] text-slate-400 mt-1">Pending client bids in your area</p>
        </div>

        <div onclick="navigate('projects')" class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:border-blue-300 transition pro-stat-card cursor-pointer">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-semibold">Active Projects</span>
            <span class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
              <i class="fa-solid fa-hammer"></i>
            </span>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-3xl font-extrabold text-slate-900">${activePrjCount < 10 ? '0' + activePrjCount : activePrjCount}</span>
            ${activePrjCount > 0
      ? '<span class="text-xs font-bold text-blue-600">In Progress</span>'
      : '<span class="text-xs font-bold text-slate-400">0 Active</span>'}
          </div>
          <p class="text-[11px] text-slate-400 mt-1">Milestones under execution</p>
        </div>

        <div onclick="navigate('earnings')" class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:border-emerald-300 transition pro-stat-card cursor-pointer">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-semibold">Total Cleared Earnings</span>
            <span class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
              <i class="fa-solid fa-indian-rupee-sign"></i>
            </span>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-3xl font-extrabold text-slate-900">₹${totalEarnings.toLocaleString('en-IN')}</span>
            <span class="text-xs font-bold ${totalEarnings > 0 ? 'text-emerald-600' : 'text-slate-400'}">Direct Escrow</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">Directly settled to your bank</p>
        </div>

        <div onclick="navigate('earnings')" class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:border-amber-300 transition pro-stat-card cursor-pointer">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-semibold">Pending in Escrow</span>
            <span class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xs">
              <i class="fa-solid fa-lock"></i>
            </span>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-3xl font-extrabold text-amber-600">₹${pendingEscrow.toLocaleString('en-IN')}</span>
            <span class="text-xs font-bold ${pendingEscrow > 0 ? 'text-amber-600' : 'text-slate-400'}">${pendingEscrow > 0 ? 'Secured' : '₹0 Held'}</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">Secured until client completion sign-off</p>
        </div>

        <div onclick="navigate('projects')" class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:border-purple-300 transition pro-stat-card cursor-pointer">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-semibold">Completed Projects</span>
            <span class="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xs">
              <i class="fa-solid fa-circle-check"></i>
            </span>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-3xl font-extrabold text-slate-900">${completedPrjCount}</span>
            <span class="text-xs font-bold ${completedPrjCount > 0 ? 'text-purple-600' : 'text-slate-400'}">${completedPrjCount > 0 ? 'Delivered' : 'None yet'}</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">Historical completed works</p>
        </div>

        <div onclick="navigate('reviews')" class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:border-yellow-300 transition pro-stat-card cursor-pointer">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-semibold">Average Client Rating</span>
            <span class="w-8 h-8 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center text-xs">
              <i class="fa-solid fa-star"></i>
            </span>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-3xl font-extrabold text-slate-900">${(currentPro.rating && currentPro.rating !== '—' && Number(currentPro.rating) > 0) ? currentPro.rating + ' ★' : '—'}</span>
            <span class="text-xs font-bold text-slate-500">${currentPro.reviewsCount ?? 0} Reviews</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">${(currentPro.location && currentPro.location.trim()) ? 'Service area: ' + escapeHtml(currentPro.location.split(',')[0]) : 'BuildBid Verified Marketplace'}</p>
        </div>

        <div onclick="navigate('profile')" class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:border-teal-300 transition pro-stat-card cursor-pointer">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-semibold">Profile Views</span>
            <span class="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-xs">
              <i class="fa-solid fa-eye"></i>
            </span>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-3xl font-extrabold text-slate-900">${(currentPro.stats?.profileViews ?? 0) > 0 ? currentPro.stats.profileViews : '—'}</span>
            <span class="text-xs font-bold text-teal-600">Visibility</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">Client searches & direct views</p>
        </div>

        <div onclick="navigate('availability')" class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:border-indigo-300 transition pro-stat-card cursor-pointer">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-semibold">Response & Close Rate</span>
            <span class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs">
              <i class="fa-solid fa-bolt"></i>
            </span>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-3xl font-extrabold text-slate-900">${currentPro.stats?.responseRate || '—'}</span>
            <span class="text-xs font-bold text-indigo-600">${currentPro.stats?.completionRate && currentPro.stats.completionRate !== '—' ? currentPro.stats.completionRate + ' Close' : 'Direct Hire'}</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">Inbound request response rate</p>
        </div>
      </div>

      <!-- TWO-COLUMN DESKTOP SPLIT: Live Requests & Active Projects with Steppers -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <!-- LEFT COLUMN: Live Requests Inbound -->
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-6 flex flex-col">
          <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Inbound Service Requests</h3>
              <p class="text-xs text-slate-500">Clients requesting direct quotations for ${displayRole}</p>
            </div>
            <button onclick="navigate('requests')" class="text-xs font-semibold text-orange-600 hover:underline">View All Table</button>
          </div>

          <div class="space-y-3.5 flex-1">
            ${(!currentPro.requests || currentPro.requests.length === 0) ? `
              <div class="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                <span>No pending service requests.</span>
              </div>
            ` : currentPro.requests.map(req => `
              <div class="p-4 rounded-xl border border-slate-200/90 hover:border-orange-300 transition bg-white space-y-3">
                <div class="flex items-start justify-between">
                  <div>
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700">${escapeHtml(req.service)}</span>
                      ${getRequestTypeBadge(req.requestType)}
                      ${getRequesterRoleBadge(req.requesterRole)}
                      <span class="text-xs text-slate-400">• ${req.distance ? escapeHtml(req.distance) + ' away' : 'Local'}</span>
                    </div>
                    <h4 class="text-sm font-bold text-slate-900 mt-1">${escapeHtml(req.project)}</h4>
                    <p class="text-xs text-slate-500">Requester: <strong class="text-slate-700">${escapeHtml(req.customer)}</strong> • <i class="fa-solid fa-location-dot text-[10px]"></i> ${escapeHtml(req.location)}</p>
                  </div>
                  <div class="text-right">
                    <span class="text-sm font-extrabold text-slate-900 block">${req.budget ? escapeHtml(req.budget) : '--'}</span>
                    <span class="text-[10px] text-slate-400"><i class="fa-regular fa-clock"></i> ${escapeHtml(req.time || '')}</span>
                  </div>
                </div>

                <p class="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 line-clamp-2">${escapeHtml(req.desc || '')}</p>

                <div class="flex items-center justify-between pt-1">
                  <div class="flex items-center gap-2">
                    <span class="text-[11px] font-semibold text-slate-500">Requested: ${escapeHtml(req.date || '--')}</span>
                    ${getRequestStatusBadge(req.status)}
                  </div>
                  <div class="flex items-center space-x-2">
                    <button onclick="openRequestModal('${escapeHtml(req.id)}')" class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition">View Details</button>
                    ${(req.status || '').toLowerCase() === 'new' ? `
                      <button onclick="acceptRequest('${escapeHtml(req.id)}')" class="px-3.5 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm transition">Accept Request</button>
                    ` : ''}
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
            ${(!currentPro.projects || currentPro.projects.length === 0) ? `
              <div class="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                <i class="fa-solid fa-folder-open text-slate-300 text-2xl mb-2 block"></i>
                <span>No active projects in progress. Client milestones will appear here once contracts are awarded.</span>
              </div>
            ` : currentPro.projects.map(prj => {
        const rawDate = prj.scheduledDate || prj.deadline || prj.targetDate || prj.date;
        const isPast = isWorkScheduledDatePast(rawDate);
        return `
              <div class="p-4 rounded-xl border border-slate-200/90 bg-white space-y-3${isPast ? ' opacity-65' : ''}"${isPast ? ' style="opacity: 0.65;"' : ''}>
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
            `;
      }).join('')}
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
                  <span>Site Consultation & Inspection</span>
                  <span class="text-[10px] text-orange-700 bg-orange-100 px-2 py-0.5 rounded">10:00 AM</span>
                </div>
                <p class="text-[11px] text-slate-500 mt-1">Client Consultation Slot</p>
                <p class="text-[10px] text-slate-400 mt-1"><i class="fa-solid fa-car"></i> Service Radius: ${currentPro.serviceRadius || 25} km</p>
              </div>
              <div class="p-3.5 bg-slate-50 rounded-xl border-l-4 border-blue-500">
                <div class="flex items-center justify-between font-bold text-slate-800">
                  <span>Scope of Work Review</span>
                  <span class="text-[10px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded">03:30 PM</span>
                </div>
                <p class="text-[11px] text-slate-500 mt-1">Online & Technical Evaluation</p>
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
                <span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg">Direct Escrow</span>
              </div>
            </div>

            <!-- Desktop Bar Chart Visualization -->
            <div class="h-44 w-full flex items-end justify-between gap-3 pt-4 px-4">
              <div class="flex-1 flex flex-col items-center gap-1 group">
                <span class="text-[11px] font-bold text-slate-500 group-hover:text-orange-600 transition">₹${Math.round(totalEarnings * 0.15).toLocaleString('en-IN')}</span>
                <div class="w-full bg-slate-100 group-hover:bg-orange-500 rounded-t-lg h-20 transition-all chart-bar-hover"></div>
                <span class="text-[11px] text-slate-400 font-medium">May</span>
              </div>
              <div class="flex-1 flex flex-col items-center gap-1 group">
                <span class="text-[11px] font-bold text-slate-500 group-hover:text-orange-600 transition">₹${Math.round(totalEarnings * 0.2).toLocaleString('en-IN')}</span>
                <div class="w-full bg-slate-100 group-hover:bg-orange-500 rounded-t-lg h-24 transition-all chart-bar-hover"></div>
                <span class="text-[11px] text-slate-400 font-medium">Jun</span>
              </div>
              <div class="flex-1 flex flex-col items-center gap-1 group">
                <span class="text-[11px] font-bold text-slate-500 group-hover:text-orange-600 transition">₹${Math.round(totalEarnings * 0.25).toLocaleString('en-IN')}</span>
                <div class="w-full bg-slate-100 group-hover:bg-orange-500 rounded-t-lg h-32 transition-all chart-bar-hover"></div>
                <span class="text-[11px] text-slate-400 font-medium">Jul</span>
              </div>
              <div class="flex-1 flex flex-col items-center gap-1 group">
                <span class="text-[11px] font-bold text-slate-500 group-hover:text-orange-600 transition">₹${Math.round(totalEarnings * 0.2).toLocaleString('en-IN')}</span>
                <div class="w-full bg-slate-100 group-hover:bg-orange-500 rounded-t-lg h-28 transition-all chart-bar-hover"></div>
                <span class="text-[11px] text-slate-400 font-medium">Aug</span>
              </div>
              <div class="flex-1 flex flex-col items-center gap-1 group">
                <span class="text-[11px] font-bold text-slate-500 group-hover:text-orange-600 transition">₹${Math.round(totalEarnings * 0.35).toLocaleString('en-IN')}</span>
                <div class="w-full bg-slate-100 group-hover:bg-orange-500 rounded-t-lg h-36 transition-all chart-bar-hover"></div>
                <span class="text-[11px] text-slate-400 font-medium">Sep</span>
              </div>
              <div class="flex-1 flex flex-col items-center gap-1 group">
                <span class="text-[11px] font-bold text-orange-600">₹${totalEarnings.toLocaleString('en-IN')}</span>
                <div class="w-full bg-orange-600 rounded-t-lg h-40 shadow-sm chart-bar-hover"></div>
                <span class="text-[11px] font-bold text-orange-600">${getDynamicDateString().split(' ')[0]}</span>
              </div>
            </div>
          </div>

          <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div class="flex items-center space-x-6">
              <span>Cleared Escrow: <strong class="text-slate-800">₹${totalEarnings.toLocaleString('en-IN')}</strong></span>
              <span>Pending Escrow: <strong class="text-slate-800">₹${pendingEscrow.toLocaleString('en-IN')}</strong></span>
            </div>
            <button onclick="navigate('earnings')" class="text-orange-600 font-semibold hover:underline">View Detailed Ledger →</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Ensure hero avatar is immediately in sync with currentPro.avatar
  const heroAvatar = document.getElementById('proHeroAvatar');
  if (heroAvatar && currentPro.avatar) {
    heroAvatar.src = currentPro.avatar;
  }
}

/* =========================================================
   FIND WORK & LIVE POST REQUIREMENT OPPORTUNITIES (STEP 9)
   ========================================================= */

let liveFindWorkRequirements = [];
let isFindWorkLoading = false;
let findWorkFetchError = null;
let findWorkFilterSpecialty = 'ALL';
let findWorkFilterRadius = 'ALL';
let findWorkFilterBudget = 'ALL';
let findWorkFilterType = 'ALL';
let findWorkSearchQuery = '';

function updateSidebarFindWorkBadge(count) {
  const badge = document.getElementById('side-findwork-badge');
  if (badge) {
    const val = typeof count === 'number' ? count : (liveFindWorkRequirements ? liveFindWorkRequirements.length : 0);
    badge.innerText = `${val} Live`;
  }
}

async function fetchFindWorkRequirements() {
  const token = getCleanToken();
  if (!token) {
    liveFindWorkRequirements = [];
    isFindWorkLoading = false;
    findWorkFetchError = 'Please log in as a registered professional to view requirement opportunities.';
    updateSidebarFindWorkBadge(0);
    if (activeRoute === 'find-work') {
      const container = document.getElementById('main-view');
      if (container) renderFindWork(container);
    }
    return;
  }

  isFindWorkLoading = true;
  findWorkFetchError = null;

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/professional/requirements`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    isFindWorkLoading = false;

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        liveFindWorkRequirements = data;
        updateSidebarFindWorkBadge(liveFindWorkRequirements.length);
      } else {
        liveFindWorkRequirements = [];
        updateSidebarFindWorkBadge(0);
      }
    } else if (res.status === 401) {
      findWorkFetchError = 'Session expired. Please log in again to view live requirement leads.';
      updateSidebarFindWorkBadge(0);
    } else if (res.status === 403) {
      findWorkFetchError = 'Access denied. Only registered professionals with verified services can access requirement opportunities.';
      updateSidebarFindWorkBadge(0);
    } else if (res.status === 404) {
      liveFindWorkRequirements = [];
      findWorkFetchError = null;
      updateSidebarFindWorkBadge(0);
    } else {
      let errBody = {};
      try { errBody = await res.json(); } catch (_) { }
      findWorkFetchError = errBody.error || `Unable to fetch opportunities from server (Status ${res.status}).`;
      console.warn("Could not fetch requirements from backend, status:", res.status);
    }
  } catch (err) {
    isFindWorkLoading = false;
    findWorkFetchError = 'Network error: Could not connect to backend server. Please check your connection.';
    console.warn("Could not fetch requirements from backend:", err);
  }

  if (activeRoute === 'find-work') {
    const container = document.getElementById('main-view');
    if (container) renderFindWork(container);
  }
}

function renderFindWork(container) {
  // Collect unique trade specialties for the specialty filter dropdown
  const allTrades = new Set();
  (liveFindWorkRequirements || []).forEach(req => {
    (req.tradeRequirements || []).forEach(t => {
      if (t.tradeRole) allTrades.add(t.tradeRole);
    });
  });

  const specialtyOptions = Array.from(allTrades).sort();

  container.innerHTML = `
    <div class="space-y-6 max-w-[1700px] mx-auto">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Find Work & Post Requirement Opportunities</h2>
          <p class="text-xs text-slate-500">Live multi-trade project tenders matching your verified services.</p>
        </div>
        <div class="flex items-center space-x-3 text-xs">
          <button onclick="fetchFindWorkRequirements()" class="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5">
            <i class="fa-solid fa-arrows-rotate ${isFindWorkLoading ? 'fa-spin text-orange-600' : 'text-slate-500'}"></i>
            <span>Refresh Leads</span>
          </button>
          <span class="text-slate-500">Active Perimeter: <strong class="text-slate-800">${escapeHtml(currentPro.serviceRadius || '25')} km</strong></span>
          <button onclick="navigate('availability')" class="text-orange-600 font-semibold hover:underline">Change Radius</button>
        </div>
      </div>

      <!-- Desktop Filter & Search Bar -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-subtle space-y-3 text-xs">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Service Specialty / Trade</label>
            <select id="findwork-filter-specialty" onchange="applyFindWorkFilters()" class="w-full p-2.5 border border-slate-200 rounded-xl outline-none bg-white">
              <option value="ALL">All Eligible Trades (${specialtyOptions.length > 0 ? specialtyOptions.length : 'Any'})</option>
              ${specialtyOptions.map(trade => `<option value="${escapeHtml(trade)}" ${findWorkFilterSpecialty === trade ? 'selected' : ''}>${escapeHtml(trade)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Location Radius</label>
            <select id="findwork-filter-radius" onchange="applyFindWorkFilters()" class="w-full p-2.5 border border-slate-200 rounded-xl outline-none bg-white">
              <option value="ALL" ${findWorkFilterRadius === 'ALL' ? 'selected' : ''}>All Locations</option>
              <option value="LOCAL" ${findWorkFilterRadius === 'LOCAL' ? 'selected' : ''}>Within ${escapeHtml(currentPro.serviceRadius || '25')} km (${escapeHtml((currentPro.location || '').split(',')[0] || 'Local')})</option>
              <option value="50KM" ${findWorkFilterRadius === '50KM' ? 'selected' : ''}>Within 50 km (Extended Region)</option>
            </select>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Budget Allocation</label>
            <select id="findwork-filter-budget" onchange="applyFindWorkFilters()" class="w-full p-2.5 border border-slate-200 rounded-xl outline-none bg-white">
              <option value="ALL" ${findWorkFilterBudget === 'ALL' ? 'selected' : ''}>Any Budget</option>
              <option value="UNDER_20K" ${findWorkFilterBudget === 'UNDER_20K' ? 'selected' : ''}>Under ₹20,000</option>
              <option value="20K_50K" ${findWorkFilterBudget === '20K_50K' ? 'selected' : ''}>₹20,000 – ₹50,000</option>
              <option value="50K_PLUS" ${findWorkFilterBudget === '50K_PLUS' ? 'selected' : ''}>₹50,000+</option>
            </select>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Application Status</label>
            <select id="findwork-filter-type" onchange="applyFindWorkFilters()" class="w-full p-2.5 border border-slate-200 rounded-xl outline-none bg-white">
              <option value="ALL" ${findWorkFilterType === 'ALL' ? 'selected' : ''}>All Postings</option>
              <option value="OPEN" ${findWorkFilterType === 'OPEN' ? 'selected' : ''}>Open for Quotation</option>
              <option value="APPLIED" ${findWorkFilterType === 'APPLIED' ? 'selected' : ''}>Already Applied</option>
            </select>
          </div>
        </div>

        <!-- Search Input Bar -->
        <div class="relative w-full pt-1 border-t border-slate-100 flex items-center justify-between">
          <div class="relative flex-1">
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input type="text" id="findwork-search-input" placeholder="Search by requirement ID, project title, trade role, or location..." value="${escapeHtml(findWorkSearchQuery)}" oninput="handleFindWorkSearch(this.value)" class="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800 placeholder-slate-400">
          </div>
          <span id="findwork-count-text" class="text-[11px] text-slate-500 font-medium ml-3 whitespace-nowrap">
            ${liveFindWorkRequirements.length} Opportunities Live
          </span>
        </div>
      </div>

      <!-- Container for dynamic cards -->
      <div id="findwork-cards-container">
        <!-- Rendered by applyFindWorkFilters() -->
      </div>
    </div>
  `;

  applyFindWorkFilters();
}

function handleFindWorkSearch(val) {
  findWorkSearchQuery = (val || '').trim();
  applyFindWorkFilters();
}

function resetFindWorkFilters() {
  findWorkFilterSpecialty = 'ALL';
  findWorkFilterRadius = 'ALL';
  findWorkFilterBudget = 'ALL';
  findWorkFilterType = 'ALL';
  findWorkSearchQuery = '';
  const c = document.getElementById('main-view');
  if (c) renderFindWork(c);
}

function applyFindWorkFilters() {
  const container = document.getElementById('findwork-cards-container');
  if (!container) return;

  const specialtyEl = document.getElementById('findwork-filter-specialty');
  const radiusEl = document.getElementById('findwork-filter-radius');
  const budgetEl = document.getElementById('findwork-filter-budget');
  const typeEl = document.getElementById('findwork-filter-type');
  const searchEl = document.getElementById('findwork-search-input');

  if (specialtyEl) findWorkFilterSpecialty = specialtyEl.value;
  if (radiusEl) findWorkFilterRadius = radiusEl.value;
  if (budgetEl) findWorkFilterBudget = budgetEl.value;
  if (typeEl) findWorkFilterType = typeEl.value;
  if (searchEl) findWorkSearchQuery = searchEl.value.trim();

  // Handle loading state
  if (isFindWorkLoading) {
    container.innerHTML = `
      <div class="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-subtle">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent mb-3"></div>
        <p class="text-sm font-semibold text-slate-800">Loading Live Requirement Leads...</p>
        <p class="text-xs text-slate-500 mt-1">Connecting to BuildBid Post Requirement tender network</p>
      </div>
    `;
    return;
  }

  // Handle fetch error state
  if (findWorkFetchError) {
    container.innerHTML = `
      <div class="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3 max-w-xl mx-auto shadow-subtle">
        <div class="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto text-lg">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h3 class="text-sm font-bold text-rose-900">${escapeHtml(findWorkFetchError)}</h3>
        <p class="text-xs text-rose-700">Please verify your session status or network connection.</p>
        <div>
          <button onclick="fetchFindWorkRequirements()" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold transition">
            <i class="fa-solid fa-arrow-rotate-right mr-1.5"></i> Retry
          </button>
        </div>
      </div>
    `;
    return;
  }

  let filtered = [...liveFindWorkRequirements];

  // Specialty filter
  if (findWorkFilterSpecialty !== 'ALL') {
    filtered = filtered.filter(req => {
      return (req.tradeRequirements || []).some(t =>
        (t.tradeRole || '').toLowerCase() === findWorkFilterSpecialty.toLowerCase()
      );
    });
  }

  // Application status filter
  if (findWorkFilterType === 'OPEN') {
    filtered = filtered.filter(req => !req.hasApplied);
  } else if (findWorkFilterType === 'APPLIED') {
    filtered = filtered.filter(req => req.hasApplied);
  }

  // Budget filter
  if (findWorkFilterBudget !== 'ALL') {
    filtered = filtered.filter(req => {
      const eligibleTrade = (req.tradeRequirements || []).find(t => t.eligible) || (req.tradeRequirements || [])[0];
      const amt = (eligibleTrade && eligibleTrade.offerAmount) ? Number(eligibleTrade.offerAmount) : 0;
      if (findWorkFilterBudget === 'UNDER_20K') return amt > 0 && amt < 20000;
      if (findWorkFilterBudget === '20K_50K') return amt >= 20000 && amt <= 50000;
      if (findWorkFilterBudget === '50K_PLUS') return amt > 50000;
      return true;
    });
  }

  // Search query
  if (findWorkSearchQuery) {
    const q = findWorkSearchQuery.toLowerCase();
    filtered = filtered.filter(req => {
      const title = (req.projectTitle || '').toLowerCase();
      const pId = (req.projectId || '').toLowerCase();
      const desc = (req.description || '').toLowerCase();
      const loc = (req.location || '').toLowerCase();
      const pType = (req.projectType || '').toLowerCase();
      const trades = (req.tradeRequirements || []).map(t => (t.tradeRole || '').toLowerCase()).join(' ');
      return title.includes(q) || pId.includes(q) || desc.includes(q) || loc.includes(q) || pType.includes(q) || trades.includes(q);
    });
  }

  const countText = document.getElementById('findwork-count-text');
  if (countText) {
    countText.innerText = `${filtered.length} of ${liveFindWorkRequirements.length} Shown`;
  }

  // Empty state
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="py-16 text-center bg-white rounded-2xl border border-slate-200/90 p-8 shadow-subtle">
        <div class="w-14 h-14 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl border border-orange-100">
          <i class="fa-solid fa-magnifying-glass"></i>
        </div>
        <h3 class="text-sm font-bold text-slate-800">No Matching Requirements Found</h3>
        <p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          No live Post Requirements match your current filter selection. Try changing the trade specialty, budget range, or search criteria.
        </p>
        <div class="mt-4 flex items-center justify-center gap-2">
          <button onclick="resetFindWorkFilters()" class="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold">
            Reset Filters
          </button>
          <button onclick="fetchFindWorkRequirements()" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold">
            <i class="fa-solid fa-arrows-rotate mr-1"></i> Refresh Leads
          </button>
        </div>
      </div>
    `;
    return;
  }

  // Render cards grid
  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      ${filtered.map(req => renderFindWorkCardHtml(req)).join('')}
    </div>
  `;
}

function renderFindWorkCardHtml(req) {
  const eligibleTrades = (req.tradeRequirements || []).filter(t => t.eligible);
  const primaryEligible = eligibleTrades[0] || (req.tradeRequirements || [])[0] || null;

  let offerDisplay = 'Quotation Invited';
  if (primaryEligible && primaryEligible.offerAmount && Number(primaryEligible.offerAmount) > 0) {
    offerDisplay = '₹' + Number(primaryEligible.offerAmount).toLocaleString('en-IN');
    if (primaryEligible.offerType) {
      offerDisplay += ` <span class="text-xs font-normal text-slate-500">/ ${escapeHtml(primaryEligible.offerType)}</span>`;
    }
  }

  const tradesHtml = (req.tradeRequirements || []).map(t => {
    const isEligible = !!t.eligible;
    const isFilled = (t.remainingQuantity <= 0) || t.filled;
    let cardClass = isEligible
      ? (isFilled ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-orange-50/70 text-orange-950 border-orange-200 font-medium')
      : 'bg-slate-50 text-slate-600 border-slate-200';
    return `
      <div class="px-2.5 py-1.5 rounded-xl border text-[11px] ${cardClass} flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5 truncate">
          ${isEligible ? '<span class="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-orange-600 text-white text-[9px]"><i class="fa-solid fa-check"></i></span>' : '<span class="w-1.5 h-1.5 rounded-full bg-slate-300"></span>'}
          <span class="truncate font-semibold">${escapeHtml(t.tradeRole)}</span>
        </div>
        <div class="flex items-center gap-1 font-mono text-[10px] shrink-0">
          ${isFilled ? '<span class="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold uppercase text-[9px]">Filled</span>' : `<span>Req: <strong>${t.requiredQuantity}</strong></span><span class="text-slate-300">|</span><span>Rem: <strong class="text-emerald-700">${t.remainingQuantity}</strong></span>`}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-subtle hover:border-orange-400 transition flex flex-col justify-between space-y-4">
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold uppercase tracking-wider">${escapeHtml(req.projectType || 'Project')}</span>
            <span class="font-mono text-[10px] text-slate-400">#${escapeHtml(req.projectId)}</span>
          </div>
          <span class="text-sm font-extrabold text-slate-900">${offerDisplay}</span>
        </div>

        <div>
          <h3 class="text-sm font-bold text-slate-900">${escapeHtml(req.projectTitle || 'Post Requirement Opportunity')}</h3>
          <p class="text-xs text-slate-600 mt-1.5 line-clamp-3 leading-relaxed">${escapeHtml(req.description || 'No detailed scope description provided.')}</p>
        </div>

        <div class="space-y-1.5 pt-1">
          <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Trade Requirements</span>
            ${req.startDate ? `<span>Starts ${escapeHtml(req.startDate)}</span>` : ''}
          </div>
          <div class="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
            ${tradesHtml}
          </div>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
        <span class="text-slate-500 truncate" title="${escapeHtml(req.location || 'Location upon request')}">
          <i class="fa-solid fa-location-dot text-slate-400 mr-1"></i>${escapeHtml(req.location || 'Location upon request')}
        </span>
        <div class="flex items-center gap-2 shrink-0">
          <button onclick="openRequirementDetailModal('${escapeHtml(req.projectId)}')" class="px-3 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold text-xs transition">
            Details
          </button>
          ${req.hasApplied ? (() => {
      const st = (req.applicationStatus || 'APPLIED').toUpperCase();
      if (st === 'ACCEPTED') {
        return '<span class="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1.5 shadow-2xs"><i class="fa-solid fa-circle-check text-emerald-600"></i> Accepted</span>';
      } else if (st === 'SHORTLISTED') {
        return '<span class="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300 inline-flex items-center gap-1.5 shadow-2xs"><i class="fa-solid fa-star text-purple-600"></i> Shortlisted</span>';
      } else if (st === 'REJECTED') {
        return '<span class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1.5"><i class="fa-solid fa-circle-xmark text-slate-400"></i> Not Selected</span>';
      }
      return '<span class="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1.5 shadow-2xs"><i class="fa-solid fa-paper-plane text-blue-500"></i> Applied</span>';
    })() : (
      primaryEligible && (primaryEligible.remainingQuantity <= 0 || primaryEligible.filled) ? `
              <button disabled class="px-4 py-2 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl font-semibold text-xs cursor-not-allowed">Requirement Filled</button>
            ` : primaryEligible ? `
              <button onclick="openProposalModal('${escapeHtml(req.projectId)}', '${escapeHtml(primaryEligible.tradeRole)}', ${primaryEligible.offerAmount || 0}, '${escapeHtml(primaryEligible.offerType || 'PER_DAY')}')" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold shadow-sm transition text-xs flex items-center gap-1.5">
                <span>Send Proposal</span> <i class="fa-solid fa-arrow-right text-[10px]"></i>
              </button>
            ` : `
              <button disabled class="px-4 py-2 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl font-semibold text-xs cursor-not-allowed" title="Your verified profile does not match requested trades">Trade Not Eligible</button>
            `
    )}
        </div>
      </div>
    </div>
  `;
}

async function openRequirementDetailModal(projectId) {
  const modal = document.getElementById('modal-requirement-detail');
  const body = document.getElementById('modal-requirement-body');
  if (!modal || !body) return;

  openModal('modal-requirement-detail');

  body.innerHTML = `
    <div class="py-12 text-center text-slate-500">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent mb-3"></div>
      <p class="text-xs font-semibold text-slate-700">Loading requirement scope and trade quotas...</p>
    </div>
  `;

  const token = getCleanToken();
  if (!token) {
    body.innerHTML = `
      <div class="p-6 text-center space-y-3">
        <p class="text-xs text-rose-600 font-semibold">Please log in to view requirement details.</p>
        <button onclick="closeModal('modal-requirement-detail')" class="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold">Close</button>
      </div>
    `;
    return;
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/professional/requirements/${encodeURIComponent(projectId)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (res.ok) {
      const d = await res.json();
      renderRequirementDetailBody(body, d);
    } else if (res.status === 401) {
      body.innerHTML = `
        <div class="p-6 text-center space-y-3">
          <p class="text-xs text-rose-600 font-semibold">Session expired. Please log in again.</p>
          <button onclick="closeModal('modal-requirement-detail')" class="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold">Close</button>
        </div>
      `;
    } else if (res.status === 403) {
      body.innerHTML = `
        <div class="p-6 text-center space-y-3">
          <p class="text-xs text-rose-600 font-semibold">Access denied. Only registered professionals can view requirement details.</p>
          <button onclick="closeModal('modal-requirement-detail')" class="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold">Close</button>
        </div>
      `;
    } else if (res.status === 404) {
      body.innerHTML = `
        <div class="p-6 text-center space-y-3">
          <p class="text-xs text-slate-600 font-semibold">Requirement not found or is no longer available.</p>
          <button onclick="closeModal('modal-requirement-detail')" class="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold">Close</button>
        </div>
      `;
    } else {
      body.innerHTML = `
        <div class="p-6 text-center space-y-3">
          <p class="text-xs text-rose-600 font-semibold">Unable to load details (Status ${res.status}).</p>
          <button onclick="closeModal('modal-requirement-detail')" class="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold">Close</button>
        </div>
      `;
    }
  } catch (err) {
    console.error("Error fetching requirement detail:", err);
    body.innerHTML = `
      <div class="p-6 text-center space-y-3">
        <p class="text-xs text-rose-600 font-semibold">Network error: Could not connect to server.</p>
        <button onclick="closeModal('modal-requirement-detail')" class="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold">Close</button>
      </div>
    `;
  }
}

function renderRequirementDetailBody(body, d) {
  const reqTrades = d.tradeRequirements || [];
  const eligibleTrades = reqTrades.filter(t => t.eligible);
  const firstEligible = eligibleTrades[0] || null;

  body.innerHTML = `
    <div class="space-y-4">
      <!-- Header meta strip -->
      <div class="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div class="space-y-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-mono font-bold text-slate-800 text-xs">#${escapeHtml(d.projectId)}</span>
            <span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold uppercase tracking-wider">${escapeHtml(d.projectType || 'Project')}</span>
            <span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold uppercase tracking-wider">${escapeHtml(d.status || 'OPEN')}</span>
          </div>
          <h4 class="text-sm font-bold text-slate-900 mt-1">${escapeHtml(d.projectTitle || 'Post Requirement')}</h4>
          <div class="flex items-center gap-3 text-slate-500 text-[11px] flex-wrap">
            <span><i class="fa-solid fa-location-dot text-slate-400 mr-1"></i>${escapeHtml(d.location || 'Location upon request')}</span>
            <span><i class="fa-regular fa-calendar text-slate-400 mr-1"></i>Start Date: ${escapeHtml(d.startDate || 'Immediate')}</span>
          </div>
        </div>
      </div>

      <!-- Scope / Description -->
      <div class="p-4 border border-slate-200/90 rounded-xl bg-white space-y-1.5">
        <span class="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
          <i class="fa-solid fa-align-left text-orange-600"></i>
          Project Scope & Requirement Overview
        </span>
        <p class="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
          ${escapeHtml(d.description || 'No detailed scope description provided by requester.')}
        </p>
      </div>

      <!-- Multi-Trade Requirements Breakdown -->
      <div class="p-4 border border-slate-200/90 rounded-xl bg-white space-y-2.5">
        <span class="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
          <i class="fa-solid fa-users-gear text-orange-600"></i>
          Trade Roles & Staffing Quotas
        </span>
        <div class="space-y-2">
          ${reqTrades.map(t => {
    const isEligible = !!t.eligible;
    const isFilled = (t.remainingQuantity <= 0) || t.filled;
    const offerText = (t.offerAmount && Number(t.offerAmount) > 0)
      ? `₹${Number(t.offerAmount).toLocaleString('en-IN')}${t.offerType ? ' / ' + escapeHtml(t.offerType) : ''}`
      : 'Open for Quotation';

    return `
              <div class="p-2.5 rounded-xl border ${isEligible ? (isFilled ? 'bg-slate-50 border-slate-200' : 'bg-orange-50/60 border-orange-200') : 'bg-slate-50/50 border-slate-200'} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div class="space-y-0.5">
                  <div class="flex items-center gap-1.5">
                    ${isEligible ? '<span class="px-1.5 py-0.5 rounded bg-orange-600 text-white text-[9px] font-bold">Your Trade</span>' : '<span class="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[9px]">Trade</span>'}
                    <span class="font-bold text-xs text-slate-900">${escapeHtml(t.tradeRole)}</span>
                    ${isFilled ? '<span class="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-bold uppercase">Capacity Filled</span>' : '<span class="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold">Positions Open</span>'}
                  </div>
                  <div class="text-[11px] text-slate-500">
                    Client Target Offer: <strong class="text-slate-700">${offerText}</strong>
                  </div>
                </div>
                <div class="flex items-center gap-2 text-[11px] font-mono shrink-0">
                  <span class="px-2 py-1 bg-white rounded-lg border border-slate-200">Required: <strong>${t.requiredQuantity}</strong></span>
                  <span class="px-2 py-1 bg-white rounded-lg border border-slate-200">Accepted: <strong class="text-slate-700">${t.acceptedQuantity}</strong></span>
                  <span class="px-2 py-1 bg-white rounded-lg border border-slate-200">Remaining: <strong class="${isFilled ? 'text-rose-600' : 'text-emerald-700'}">${t.remainingQuantity}</strong></span>
                </div>
              </div>
            `;
  }).join('')}
        </div>
      </div>

      <!-- My Application Details (If already applied) -->
      ${(d.hasApplied && d.myApplication) ? `
        <div class="p-4 border border-blue-200 rounded-xl bg-blue-50/50 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
              <i class="fa-solid fa-file-signature text-blue-600"></i>
              Your Submitted Quotation (#${escapeHtml(d.myApplication.applicationId)})
            </span>
            ${(() => {
        const st = (d.myApplication.status || 'APPLIED').toUpperCase();
        if (st === 'ACCEPTED') return '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Quotation Accepted</span>';
        if (st === 'SHORTLISTED') return '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">Shortlisted</span>';
        if (st === 'REJECTED') return '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">Not Selected</span>';
        return '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">Application Submitted</span>';
      })()}
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div>
              <span class="text-slate-400 block text-[10px]">Applied Trade</span>
              <span class="font-bold text-slate-800">${escapeHtml(d.myApplication.tradeRole)}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[10px]">Proposed Rate</span>
              <span class="font-extrabold text-slate-900">₹${Number(d.myApplication.proposedRate).toLocaleString('en-IN')} <span class="text-[9px] font-normal text-slate-500">/ ${escapeHtml(d.myApplication.rateType)}</span></span>
            </div>
            <div>
              <span class="text-slate-400 block text-[10px]">Team Size</span>
              <span class="font-bold text-slate-800">${d.myApplication.teamSize} Member(s)</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[10px]">Duration</span>
              <span class="font-bold text-slate-800">${escapeHtml(d.myApplication.estimatedDuration || '--')}</span>
            </div>
          </div>
          ${d.myApplication.coverMessage ? `
            <div class="pt-2 border-t border-blue-100 text-[11px]">
              <span class="text-slate-400 block text-[10px]">Cover Message</span>
              <p class="text-slate-700 italic">${escapeHtml(d.myApplication.coverMessage)}</p>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- BuildBid Escrow Notice -->
      <div class="p-3 bg-amber-50 rounded-xl text-amber-800 text-[11px] flex items-center space-x-2 border border-amber-100">
        <i class="fa-solid fa-shield-halved text-amber-600 text-xs"></i>
        <span>BuildBid Escrow Guarantee: Client deposits funds into platform escrow prior to work commencement. Payouts released upon milestone approval.</span>
      </div>

      <!-- Action Row -->
      <div class="flex items-center justify-between pt-3 border-t border-slate-100">
        <div>
          ${d.hasApplied ? `
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <i class="fa-solid fa-circle-check"></i> Application on File
            </span>
          ` : ''}
        </div>
        <div class="flex items-center gap-2">
          <button onclick="closeModal('modal-requirement-detail')" class="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition text-xs">
            Close
          </button>
          ${!d.hasApplied ? (
      firstEligible && (firstEligible.remainingQuantity > 0 && !firstEligible.filled) ? `
              <button onclick="closeModal('modal-requirement-detail'); openProposalModal('${escapeHtml(d.projectId)}', '${escapeHtml(firstEligible.tradeRole)}', ${firstEligible.offerAmount || 0}, '${escapeHtml(firstEligible.offerType || 'PER_DAY')}')" class="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold shadow-xs transition text-xs flex items-center gap-1.5">
                <span>Send Proposal / Quotation</span>
                <i class="fa-solid fa-arrow-right text-[10px]"></i>
              </button>
            ` : firstEligible ? `
              <button disabled class="px-4 py-2 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl font-semibold text-xs cursor-not-allowed">
                Requirement Filled
              </button>
            ` : `
              <button disabled class="px-4 py-2 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl font-semibold text-xs cursor-not-allowed">
                Trade Not Eligible
              </button>
            `
    ) : ''}
        </div>
      </div>
    </div>
  `;
}

function renderRequests(container) {
  const allReqs = (currentPro && Array.isArray(currentPro.requests)) ? currentPro.requests : [];
  const directHireRequests = allReqs.filter(r => (r.requestType || 'DIRECT_HIRE').toUpperCase() === 'DIRECT_HIRE');

  const newCount = directHireRequests.filter(r => (r.status || '').toLowerCase() === 'new').length;
  const acceptedCount = directHireRequests.filter(r => (r.status || '').toLowerCase() === 'accepted').length;
  const declinedCount = directHireRequests.filter(r => (r.status || '').toLowerCase() === 'declined').length;

  let displayedRequests = directHireRequests;

  // Filter by status
  if (requestStatusFilter !== 'ALL') {
    displayedRequests = displayedRequests.filter(r => (r.status || '').toUpperCase() === requestStatusFilter);
  }

  // Filter by search query
  if (requestSearchQuery) {
    const q = requestSearchQuery.toLowerCase();
    displayedRequests = displayedRequests.filter(r => {
      const idMatch = (r.requestId || r.id || '').toLowerCase().includes(q);
      const nameMatch = (r.requesterName || r.customer || '').toLowerCase().includes(q);
      const projectMatch = (r.projectName || r.project || '').toLowerCase().includes(q);
      const serviceMatch = (r.requestedService || r.service || '').toLowerCase().includes(q);
      const roleMatch = (r.requesterRole || '').toLowerCase().includes(q);
      const locMatch = (r.location || r.requesterLocation || '').toLowerCase().includes(q);
      return idMatch || nameMatch || projectMatch || serviceMatch || roleMatch || locMatch;
    });
  }

  container.innerHTML = `
    <div class="space-y-6 max-w-[1700px] mx-auto">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Client Service Requests Management</h2>
          <p class="text-xs text-slate-500">Review prospective client inquiries, technical requirements, and direct hire engagements.</p>
        </div>
        <div class="flex items-center space-x-2.5">
          <button onclick="fetchAndUpdateRequests()" class="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5" title="Refresh Requests from Server">
            <i class="fa-solid fa-arrows-rotate ${isRequestsLoading ? 'fa-spin text-orange-600' : 'text-slate-500'}"></i>
            <span>Refresh</span>
          </button>
          <button onclick="navigate('find-work')" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5">
            <i class="fa-solid fa-magnifying-glass text-xs"></i>
            <span>Find More Work</span>
          </button>
        </div>
      </div>

      <!-- Direct Hire Requests Category -->
      <div class="flex items-center gap-3 border-b border-slate-200 pb-3">
        <button class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-orange-600 text-white shadow-sm cursor-default">
          <i class="fa-solid fa-handshake"></i>
          <span>Direct Hire Requests</span>
          <span class="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white">${directHireRequests.length}</span>
        </button>
      </div>

      <!-- DIRECT HIRE CONTROLS & TABLE -->
      <!-- Filter & Search Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-subtle">
        <!-- Status Pills -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button onclick="setRequestsStatusFilter('ALL')" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition ${requestStatusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
            All (${directHireRequests.length})
          </button>
            <button onclick="setRequestsStatusFilter('NEW')" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition ${requestStatusFilter === 'NEW' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}">
              New (${newCount})
            </button>
            <button onclick="setRequestsStatusFilter('ACCEPTED')" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition ${requestStatusFilter === 'ACCEPTED' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}">
              Accepted (${acceptedCount})
            </button>
            <button onclick="setRequestsStatusFilter('DECLINED')" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition ${requestStatusFilter === 'DECLINED' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}">
              Declined (${declinedCount})
            </button>
          </div>

          <!-- Search Input -->
          <div class="relative w-full sm:w-72">
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input type="text" placeholder="Search by client, project, service..." value="${escapeHtml(requestSearchQuery)}" oninput="handleRequestSearch(this.value)" class="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800 placeholder-slate-400">
          </div>
        </div>

        <!-- Table Container -->
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle overflow-hidden">
          <div class="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div class="flex items-center space-x-2">
              <span class="text-xs font-bold text-slate-800">Direct Hire Requests</span>
              <span class="text-[11px] text-slate-500">(${displayedRequests.length} of ${directHireRequests.length} shown)</span>
            </div>
            <div class="text-xs text-slate-500 flex items-center space-x-2">
              <i class="fa-solid fa-shield text-emerald-600"></i>
              <span>Escrow & Identity Protected</span>
            </div>
          </div>

          ${requestsFetchError ? `
            <div class="p-8 text-center space-y-3">
              <div class="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-xl border border-rose-200">
                <i class="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div>
                <h4 class="text-sm font-bold text-slate-800">Unable to Load Client Requests</h4>
                <p class="text-xs text-slate-500 mt-1">${escapeHtml(requestsFetchError)}</p>
              </div>
              <button onclick="fetchAndUpdateRequests()" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition">
                <i class="fa-solid fa-arrows-rotate mr-1.5"></i> Retry
              </button>
            </div>
          ` : isRequestsLoading ? `
            <div class="p-12 text-center text-slate-400 space-y-2">
              <i class="fa-solid fa-circle-notch fa-spin text-2xl text-orange-500"></i>
              <p class="text-xs font-medium text-slate-500">Loading client service requests...</p>
            </div>
          ` : displayedRequests.length === 0 ? `
            <div class="p-10 text-center text-slate-400 space-y-3">
              <div class="w-12 h-12 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center mx-auto text-xl border border-slate-100">
                <i class="fa-regular fa-clipboard"></i>
              </div>
              <p class="text-xs text-slate-500 font-medium">
                ${requestSearchQuery || requestStatusFilter !== 'ALL' ? 'No requests match your current filters.' : 'No Direct Hire service requests found at this time.'}
              </p>
              ${requestSearchQuery || requestStatusFilter !== 'ALL' ? `
                <button onclick="requestStatusFilter='ALL'; requestSearchQuery=''; renderRequests(document.getElementById('main-view'));" class="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition">
                  Clear Filters
                </button>
              ` : ''}
            </div>
          ` : `
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th class="p-4">Request ID & Type</th>
                    <th class="p-4">Requester & Role</th>
                    <th class="p-4">Required Service & Project</th>
                    <th class="p-4">Location</th>
                    <th class="p-4">Target Date</th>
                    <th class="p-4">Client Budget</th>
                    <th class="p-4">Status</th>
                    <th class="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${displayedRequests.map(req => `
                    <tr class="hover:bg-slate-50/80 transition">
                      <td class="p-4">
                        <span class="font-mono font-bold text-slate-800 text-xs">${escapeHtml(req.requestId || req.id)}</span>
                        <div class="mt-1">${getRequestTypeBadge(req.requestType)}</div>
                      </td>
                      <td class="p-4">
                        <div class="font-bold text-slate-900">${escapeHtml(req.requesterName || req.customer || 'Client')}</div>
                        <div class="mt-1 flex items-center gap-1.5 flex-wrap">
                          ${getRequesterRoleBadge(req.requesterRole)}
                          ${req.requesterPhone ? `<span class="text-[10px] text-slate-500"><i class="fa-solid fa-phone text-[9px] text-slate-400"></i> ${escapeHtml(req.requesterPhone)}</span>` : ''}
                        </div>
                      </td>
                      <td class="p-4">
                        <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-100">${escapeHtml(req.requestedService || req.service)}</span>
                        <div class="font-bold text-slate-800 text-xs mt-1">${escapeHtml(req.projectName || req.project)}</div>
                      </td>
                      <td class="p-4 text-slate-600">
                        <div><i class="fa-solid fa-location-dot text-[10px] text-slate-400"></i> ${escapeHtml(req.location || 'Local')}</div>
                        ${req.distance ? `<div class="text-[10px] text-slate-400 mt-0.5">${escapeHtml(req.distance)} away</div>` : ''}
                      </td>
                      <td class="p-4 text-slate-600">${escapeHtml(req.date || '--')}</td>
                      <td class="p-4 font-bold text-slate-900">${escapeHtml(req.budget || '--')}</td>
                      <td class="p-4">
                        ${getRequestStatusBadge(req.status)}
                      </td>
                      <td class="p-4 text-right">
                        <div class="flex items-center justify-end space-x-1.5">
                          <button onclick="openRequestModal('${escapeHtml(req.id)}')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition" title="View Full Scope & Requester Details">
                            View Details
                          </button>
                          ${(req.status || '').toLowerCase() === 'new' ? `
                            <button onclick="acceptRequest('${escapeHtml(req.id)}')" class="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold text-xs shadow-xs transition">
                              Accept
                            </button>
                            <button onclick="promptDecline('${escapeHtml(req.id)}')" class="px-3 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-semibold text-xs transition">
                              Decline
                            </button>
                          ` : ''}
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
    </div>
  `;
}

function renderProjects(container) {
  container.innerHTML = `
    <div class="space-y-6 max-w-[1700px] mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-900">My Work</h2>
          <p class="text-xs text-slate-500">Track execution and completion of your assigned client work.</p>
        </div>
        <span class="text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
          Active Work: <strong class="text-slate-900">${(currentPro.projects || []).filter(p => p.status === 'Active').length} Active</strong>
        </span>
      </div>

      <div class="space-y-5">
        ${(!currentPro.projects || currentPro.projects.length === 0) ? `
          <div class="p-12 text-center bg-white rounded-2xl border border-slate-200/90 shadow-subtle space-y-3">
            <div class="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xl">
              <i class="fa-solid fa-briefcase"></i>
            </div>

            <h3 class="text-sm font-bold text-slate-800">
              No Active Work
            </h3>

            <p class="text-xs text-slate-500 font-medium">
              कोई सक्रिय कार्य नहीं है
            </p>

            <p class="text-[11px] text-slate-400 max-w-sm mx-auto">
              Accepted contracts, Direct Hire engagements, and assigned work will appear here automatically.
            </p>
          </div>
        ` : currentPro.projects.map(prj => {
    const rawDate = prj.scheduledDate || prj.deadline || prj.targetDate || prj.date;
    const isPast = prj.status !== 'Completed' && isWorkScheduledDatePast(rawDate);
    return `
          <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-6 space-y-4${isPast ? ' opacity-65' : ''}"${isPast ? ' style="opacity: 0.65;"' : ''}>
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

            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs pt-1">
              <div class="flex items-center space-x-6 text-slate-500">
                <span><i class="fa-regular fa-calendar"></i> Started: <strong class="text-slate-700">${prj.start}</strong></span>
                <span><i class="fa-regular fa-clock"></i> Target: <strong class="text-slate-700">${prj.deadline}</strong>${isPast ? ' <span class="text-rose-600 font-semibold text-[11px] ml-1">(Target Date Passed)</span>' : ''}</span>
              </div>
              <div class="space-x-2">
                <button onclick="navigate('messages')" class="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition">
                  Chat Client
                </button>
                <button onclick="markComplete('${prj.id}')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition shadow-sm">
                  <i class="fa-solid fa-check mr-1"></i> Mark Project Complete
                </button>
              </div>
            </div>
          </div>
        `;
  }).join('')}
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

async function renderServices(container) {
  container.innerHTML = `
    <div class="space-y-6 max-w-[1700px] mx-auto">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-900">My Service Catalog & Published Rates</h2>
          <p class="text-xs text-slate-500">Configure prices, scope terms, and inspection turnaround for your public profile.</p>
        </div>
        <button onclick="window.location.href='add-new-service.html'" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-xl transition shadow-sm flex items-center space-x-1.5">
          <i class="fa-solid fa-plus mr-1.5"></i> Add New Service
        </button>
      </div>

      <div id="services-grid" class="grid grid-cols-2 gap-5">
        <div class="col-span-2 py-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 p-6">
          <i class="fa-solid fa-spinner fa-spin text-orange-600 text-lg mb-2 block"></i>
          <span>Loading published services from server...</span>
        </div>
      </div>
    </div>
  `;

  const grid = document.getElementById('services-grid');
  if (!grid) return;

  const token = getCleanToken();
  let services = [];

  if (token) {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/professional/services`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        services = await res.json();
        if (Array.isArray(services)) {
          currentPro.services = services;
          updateProHeroServicesUI(services);
        }
      }
    } catch (e) {
      console.warn("Could not load services from backend, using cached state:", e);
    }
  }

  const listToRender = (services && services.length > 0) ? services : (currentPro.services || []);

  if (!listToRender || listToRender.length === 0) {
    grid.innerHTML = `
      <div class="col-span-2 py-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 p-8 shadow-subtle">
        <div class="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-3 text-lg">
          <i class="fa-solid fa-briefcase"></i>
        </div>
        <h3 class="text-sm font-bold text-slate-900">No Services Published Yet — अभी तक कोई सेवा नहीं जोड़ी गई</h3>
        <p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">Publish your specialized construction skills, pricing rates, and turnaround times for customers to hire directly.</p>
        <button onclick="window.location.href='add-new-service.html'" class="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-xl transition shadow-sm inline-flex items-center space-x-1.5">
          <i class="fa-solid fa-plus text-xs"></i>
          <span>Add Your First Service — पहली सेवा जोड़ें</span>
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = listToRender.map(srv => {
    const title = srv.serviceTitleEn || srv.name || 'Custom Service';
    const titleHi = srv.serviceTitleHi ? `<span class="text-xs text-slate-500 font-normal">/ ${srv.serviceTitleHi}</span>` : '';
    const price = typeof srv.price === 'number' ? `₹${Number(srv.price).toLocaleString('en-IN')}` : (srv.price || '₹0');
    const unit = srv.pricingUnit || srv.type || 'Per Visit';
    const duration = srv.turnaroundTime || srv.duration || '1-3 Days';
    const desc = srv.shortDescription || srv.desc || srv.detailedDescription || 'Professional construction service scope.';
    const isPending = srv.verificationStatus === 'PENDING';
    const isActive = srv.active;

    let badgeHtml = '';
    if (!isActive) {
      badgeHtml = `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200"><i class="fa-solid fa-eye-slash mr-1"></i> Hidden — छिपा हुआ</span>`;
    } else if (isPending) {
      badgeHtml = `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"><i class="fa-solid fa-hourglass-half mr-1"></i> Verification Pending — सत्यापन लंबित</span>`;
    } else {
      badgeHtml = `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><i class="fa-solid fa-circle-check mr-1"></i> Active on Profile — प्रोफ़ाइल पर सक्रिय</span>`;
    }

    return `
      <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-5 flex flex-col justify-between space-y-3">
        <div>
          <div class="flex items-start justify-between">
            <div class="pr-2">
              <h3 class="text-sm font-bold text-slate-900">${title} ${titleHi}</h3>
              <span class="text-base font-extrabold text-orange-600">${price}</span>
              <span class="text-xs text-slate-400 font-normal"> / ${unit}</span>
            </div>
            ${badgeHtml}
          </div>
          <p class="text-xs text-slate-600 mt-2">${desc}</p>
          <div class="flex items-center space-x-4 mt-2 text-[11px] text-slate-500">
            <span><i class="fa-regular fa-clock text-slate-400 mr-1"></i> Turnaround: <strong>${duration}</strong></span>
            ${srv.serviceMode ? `<span><i class="fa-solid fa-cube text-slate-400 mr-1"></i> Mode: <strong>${srv.serviceMode}</strong></span>` : ''}
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <button onclick="toggleServiceActive(${srv.id})" class="font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1">
            ${isActive ? '<i class="fa-regular fa-eye-slash"></i><span>Deactivate</span>' : '<i class="fa-regular fa-eye"></i><span>Activate</span>'}
          </button>
          <div class="space-x-1.5">
            <button onclick="showToast('Service editing is being upgraded — सेवा संपादन जल्द उपलब्ध होगा', 'info')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-xs transition">Edit</button>
            <button onclick="deleteService(${srv.id})" class="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold text-xs transition">Remove</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
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
              <img id="proProfileTabAvatar" src="${escapeHtml(currentPro.avatar)}" alt="${escapeHtml(currentPro.name)}" class="w-28 h-28 rounded-2xl object-cover ring-4 ring-white shadow-float" onerror="if (this.src !== getProfessionalFallbackAvatar(currentPro.type) && !this.src.endsWith(getProfessionalFallbackAvatar(currentPro.type))) { this.src = getProfessionalFallbackAvatar(currentPro.type); } else { this.onerror = null; }">
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

/* =========================================================
   ACCOUNT SETTINGS & PREFERENCES MODULE
   Central Control for Professional Identity, Verification & Security
   ========================================================= */

let activeSettingsTab = 'personal';
let settingsVerificationData = null;
let isVerificationLoading = false;
let settingsEmailCooldownTimer = null;
let settingsPhoneCooldownTimer = null;
let settingsEmailCooldownSec = 0;
let settingsPhoneCooldownSec = 0;

function renderAccountSettings(container) {
  if (!container) container = document.getElementById('main-view');
  if (!container) return;

  const pro = currentPro || {};
  let cachedUser = null;
  try {
    const raw = localStorage.getItem("currentUser") || localStorage.getItem("marketplaceUser");
    if (raw) cachedUser = JSON.parse(raw);
  } catch (e) { }

  const email = (cachedUser && cachedUser.email) || pro.email || "";
  const phone = (cachedUser && cachedUser.phone) || pro.phone || "";
  const location = (cachedUser && cachedUser.location) || pro.location || "";
  const displayName = (cachedUser && (cachedUser.name || cachedUser.fullName)) || pro.name || "Professional";
  const roleDisplay = pro.type || (cachedUser && cachedUser.category) || "Professional";
  const avatarUrl = pro.avatar || getProfessionalFallbackAvatar(pro.type);

  container.innerHTML = `
    <div class="space-y-6 max-w-[1700px] mx-auto pb-12">
      <!-- Settings Header Banner -->
      <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-float relative overflow-hidden border border-slate-700/60">
        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="flex items-center space-x-4">
            <div class="relative flex-shrink-0">
              <img id="settings-header-avatar" src="${escapeHtml(avatarUrl)}" alt="Avatar" class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-white/20 shadow-md" onerror="if (this.src !== getProfessionalFallbackAvatar(currentPro.type) && !this.src.endsWith(getProfessionalFallbackAvatar(currentPro.type))) { this.src = getProfessionalFallbackAvatar(currentPro.type); } else { this.onerror = null; }">
              <span class="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px] ring-2 ring-slate-900" title="Active Account">
                <i class="fa-solid fa-check"></i>
              </span>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h2 id="settings-display-name" class="text-xl sm:text-2xl font-bold tracking-tight text-white">${escapeHtml(displayName)}</h2>
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/20 text-orange-300 border border-orange-400/30">
                  <i class="fa-solid fa-user-check text-[10px] mr-1"></i> ${escapeHtml(roleDisplay)}
                </span>
                <span id="settings-verified-badge-pill" class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${pro.isVerified ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-slate-700/60 text-slate-300 border border-slate-600/40'}">
                  <i class="fa-solid ${pro.isVerified ? 'fa-circle-check text-emerald-400' : 'fa-shield text-slate-400'} text-[10px] mr-1"></i> ${pro.isVerified ? 'Verified Partner' : 'Standard Account'}
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                <span><i class="fa-solid fa-id-card text-slate-500 mr-1"></i> ID: <strong class="font-mono text-slate-300">${escapeHtml(pro.id || 'BBD-PRO-84920')}</strong></span>
                <span>•</span>
                <span><i class="fa-solid fa-envelope text-slate-500 mr-1"></i> ${escapeHtml(email || 'Email on file')}</span>
                <span>•</span>
                <span><i class="fa-solid fa-location-dot text-slate-500 mr-1"></i> ${escapeHtml(location || 'Service Territory')}</span>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-3 flex-wrap">
            <button onclick="syncSettingsWithServer()" class="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/10 backdrop-blur-xs transition flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-arrows-rotate"></i> Sync Server Data
            </button>
            <button onclick="executeLogout()" class="px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold rounded-xl border border-rose-400/30 backdrop-blur-xs transition flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-power-off"></i> Sign Out
            </button>
          </div>
        </div>

        <!-- Decorative Watermark Icon -->
        <div class="absolute -right-8 -bottom-8 opacity-5 pointer-events-none">
          <i class="fa-solid fa-gear text-[180px]"></i>
        </div>
      </div>

      <!-- Navigation Tabs Bar -->
      <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-2 overflow-x-auto">
        <div class="flex items-center space-x-1 min-w-max">
          <button id="settings-tab-btn-personal" onclick="switchSettingsTab('personal')" class="settings-tab-btn ${activeSettingsTab === 'personal' ? 'active' : ''}">
            <i class="fa-solid fa-user-pen"></i> Personal Information
          </button>
          <button id="settings-tab-btn-verification" onclick="switchSettingsTab('verification')" class="settings-tab-btn ${activeSettingsTab === 'verification' ? 'active' : ''}">
            <i class="fa-solid fa-shield-halved"></i> Email & Mobile Verification
            <span id="tab-verification-pill" class="ml-1 w-2 h-2 rounded-full ${pro.isVerified ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
          </button>
          <button id="settings-tab-btn-security" onclick="switchSettingsTab('security')" class="settings-tab-btn ${activeSettingsTab === 'security' ? 'active' : ''}">
            <i class="fa-solid fa-lock"></i> Security & Login
          </button>
          <button id="settings-tab-btn-preferences" onclick="switchSettingsTab('preferences')" class="settings-tab-btn ${activeSettingsTab === 'preferences' ? 'active' : ''}">
            <i class="fa-solid fa-sliders"></i> Professional Preferences
          </button>
          <button id="settings-tab-btn-notifications" onclick="switchSettingsTab('notifications')" class="settings-tab-btn ${activeSettingsTab === 'notifications' ? 'active' : ''}">
            <i class="fa-solid fa-bell"></i> Notifications & Regional
          </button>
          <button id="settings-tab-btn-lifecycle" onclick="switchSettingsTab('lifecycle')" class="settings-tab-btn ${activeSettingsTab === 'lifecycle' ? 'active' : ''}">
            <i class="fa-solid fa-database"></i> Account Data & Lifecycle
          </button>
        </div>
      </div>

      <!-- Tab Content Area -->
      <div id="settings-tab-content" class="settings-panel">
        <!-- Rendered dynamically -->
      </div>
    </div>
  `;

  renderCurrentSettingsTab();
  loadSettingsVerificationAsync();
}

function switchSettingsTab(tabName) {
  activeSettingsTab = tabName;
  document.querySelectorAll('.settings-tab-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`settings-tab-btn-${tabName}`);
  if (activeBtn) activeBtn.classList.add('active');
  renderCurrentSettingsTab();
}

function renderCurrentSettingsTab() {
  const contentEl = document.getElementById('settings-tab-content');
  if (!contentEl) return;

  switch (activeSettingsTab) {
    case 'personal':
      renderSettingsPersonalTab(contentEl);
      break;
    case 'verification':
      renderSettingsVerificationTab(contentEl);
      break;
    case 'security':
      renderSettingsSecurityTab(contentEl);
      break;
    case 'preferences':
      renderSettingsPreferencesTab(contentEl);
      break;
    case 'notifications':
      renderSettingsNotificationsTab(contentEl);
      break;
    case 'lifecycle':
      renderSettingsLifecycleTab(contentEl);
      break;
    default:
      renderSettingsPersonalTab(contentEl);
  }
}

/* --- TAB 1: PERSONAL INFORMATION --- */
function renderSettingsPersonalTab(container) {
  const pro = currentPro || {};
  let cachedUser = null;
  try {
    const raw = localStorage.getItem("currentUser") || localStorage.getItem("marketplaceUser");
    if (raw) cachedUser = JSON.parse(raw);
  } catch (e) { }

  const email = (cachedUser && cachedUser.email) || pro.email || "";
  const phone = (cachedUser && cachedUser.phone) || pro.phone || "";
  const location = (cachedUser && cachedUser.location) || pro.location || "";
  const username = (cachedUser && cachedUser.username) || (email ? email.split('@')[0] : 'professional');
  const name = (cachedUser && (cachedUser.name || cachedUser.fullName)) || pro.name || "Professional";
  const about = (cachedUser && cachedUser.about) || pro.about || "Licensed professional providing engineering and architectural consultancy services through the BuildBid verified partner marketplace.";
  const pincode = (cachedUser && cachedUser.pincode) || pro.pincode || "110001";
  const skills = Array.isArray(pro.skills) ? pro.skills : ["Structural Analysis", "BOQ Estimation", "Site Inspection"];

  container.innerHTML = `
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-6 sm:p-8 space-y-6">
      <div class="border-b border-slate-100 pb-5">
        <h3 class="text-base font-bold text-slate-900">Personal Information & Professional Details</h3>
        <p class="text-xs text-slate-500 mt-1">Manage your identity details, professional bio, registered location, and public competencies.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div>
          <label class="block font-semibold text-slate-700 mb-1.5">Full Name / Business Title</label>
          <input type="text" id="settings-input-name" value="${escapeHtml(name)}" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition">
          <p class="text-[11px] text-slate-400 mt-1">Displayed to clients on quotation proposals and project contracts.</p>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1.5">Username / Partner Handle</label>
          <div class="flex items-center">
            <span class="px-3 py-2.5 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-slate-500 font-mono text-xs">@</span>
            <input type="text" id="settings-input-username" value="${escapeHtml(username)}" readonly class="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-r-xl text-slate-600 text-xs cursor-not-allowed">
          </div>
          <p class="text-[11px] text-slate-400 mt-1">Unique immutable identifier assigned to your authenticated account.</p>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1.5">Operating City / Territory Base</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <i class="fa-solid fa-location-dot"></i>
            </span>
            <input type="text" id="settings-input-location" value="${escapeHtml(location)}" placeholder="e.g. South Delhi, New Delhi" class="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition">
          </div>
          <p class="text-[11px] text-slate-400 mt-1">Primary dispatch location for calculating project distance and service radius.</p>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1.5">Base Postal Pincode</label>
          <input type="text" id="settings-input-pincode" value="${escapeHtml(pincode)}" placeholder="e.g. 110001" maxlength="6" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition">
          <p class="text-[11px] text-slate-400 mt-1">6-digit Indian PIN code for localized lead matching.</p>
        </div>

        <div class="md:col-span-2">
          <label class="block font-semibold text-slate-700 mb-1.5">Professional Summary & Scope of Practice</label>
          <textarea id="settings-input-about" rows="3" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition leading-relaxed">${escapeHtml(about)}</textarea>
          <p class="text-[11px] text-slate-400 mt-1">Summarize your professional qualifications, engineering specialties, and years of market experience.</p>
        </div>

        <div class="md:col-span-2">
          <label class="block font-semibold text-slate-700 mb-1.5">Verified Skills & Engineering Competencies</label>
          <div class="flex flex-wrap gap-2 mb-2">
            ${skills.map(s => `
              <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs">
                ${escapeHtml(s)}
              </span>
            `).join('')}
          </div>
          <p class="text-[11px] text-slate-400">Competencies are audited against regulatory licenses under <a href="javascript:void(0)" onclick="navigate('documents')" class="text-orange-600 hover:underline font-semibold">Documents & Licenses</a>.</p>
        </div>
      </div>

      <div class="flex items-center justify-between pt-5 border-t border-slate-100 flex-wrap gap-4">
        <p class="text-xs text-slate-400">Changes are synchronized with your active session.</p>
        <button onclick="savePersonalInformation()" class="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer">
          <i class="fa-solid fa-floppy-disk"></i> Save Personal Details
        </button>
      </div>
    </div>
  `;
}

function savePersonalInformation() {
  const nameInput = document.getElementById('settings-input-name');
  const locInput = document.getElementById('settings-input-location');
  const pinInput = document.getElementById('settings-input-pincode');
  const aboutInput = document.getElementById('settings-input-about');

  const newName = nameInput ? nameInput.value.trim() : '';
  const newLoc = locInput ? locInput.value.trim() : '';
  const newPin = pinInput ? pinInput.value.trim() : '';
  const newAbout = aboutInput ? aboutInput.value.trim() : '';

  if (!newName) {
    showToast('Please provide a valid account name.', 'warning');
    return;
  }

  currentPro.name = newName;
  if (newLoc) currentPro.location = newLoc;
  if (newPin) currentPro.pincode = newPin;
  if (newAbout) currentPro.about = newAbout;

  // Persist to user session
  try {
    const raw = localStorage.getItem('currentUser') || localStorage.getItem('marketplaceUser');
    let u = raw ? JSON.parse(raw) : {};
    u.name = newName;
    u.fullName = newName;
    if (newLoc) u.location = newLoc;
    if (newPin) u.pincode = newPin;
    if (newAbout) u.about = newAbout;
    localStorage.setItem('currentUser', JSON.stringify(u));
  } catch (e) { }

  syncIdentityWithStoredSession();
  renderAccountSettings(document.getElementById('main-view'));
  showToast('Personal information updated successfully.', 'success');
}

/* --- TAB 2: EMAIL & MOBILE VERIFICATION --- */
async function loadSettingsVerificationAsync() {
  const token = getCleanToken();
  if (!token) return;

  isVerificationLoading = true;
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/verification/status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (res.ok) {
      settingsVerificationData = await res.json();
      if (activeSettingsTab === 'verification') {
        const contentEl = document.getElementById('settings-tab-content');
        if (contentEl) renderSettingsVerificationTab(contentEl);
      }
    }
  } catch (e) {
    console.warn('Could not load verification status:', e);
  } finally {
    isVerificationLoading = false;
  }
}

function renderSettingsVerificationTab(container) {
  const pro = currentPro || {};
  let cachedUser = null;
  try {
    const raw = localStorage.getItem("currentUser") || localStorage.getItem("marketplaceUser");
    if (raw) cachedUser = JSON.parse(raw);
  } catch (e) { }

  const v = settingsVerificationData || {};
  const email = v.email || (cachedUser && cachedUser.email) || pro.email || "";
  const phone = v.phone || (cachedUser && cachedUser.phone) || pro.phone || "";
  const isEmailVerified = Boolean(v.emailVerified || (cachedUser && cachedUser.emailVerified));
  const isPhoneVerified = Boolean(v.phoneVerified || (cachedUser && cachedUser.phoneVerified));

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Overview Banner -->
      <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-6">
        <div class="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h3 class="text-base font-bold text-slate-900">Email & Mobile Contact Verification</h3>
            <p class="text-xs text-slate-500 mt-1">Verified contact credentials unlock direct client phone notifications, instant consultation booking, and official partner trust badges.</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-full text-xs font-bold ${isEmailVerified && isPhoneVerified ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'}">
              <i class="fa-solid ${isEmailVerified && isPhoneVerified ? 'fa-circle-check text-emerald-600' : 'fa-triangle-exclamation text-amber-600'} mr-1"></i>
              ${isEmailVerified && isPhoneVerified ? 'Fully Verified Contact' : 'Verification Incomplete'}
            </span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- EMAIL VERIFICATION CARD -->
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-6 flex flex-col justify-between space-y-5">
          <div>
            <div class="flex items-center justify-between pb-4 border-b border-slate-100">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-xl ${isEmailVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'} flex items-center justify-center text-lg">
                  <i class="fa-solid fa-envelope"></i>
                </div>
                <div>
                  <h4 class="text-xs font-bold text-slate-900">Registered Email Address</h4>
                  <p class="text-[11px] text-slate-400">Primary delivery for milestone escrow releases</p>
                </div>
              </div>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isEmailVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                <i class="fa-solid ${isEmailVerified ? 'fa-circle-check' : 'fa-clock'} mr-1"></i>
                ${isEmailVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>

            <div class="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Account Email</span>
              <p class="text-xs font-mono font-bold text-slate-800 mt-0.5">${escapeHtml(email || 'No email associated')}</p>
              ${v.emailVerifiedAt ? `<span class="text-[10px] text-emerald-600 block mt-1"><i class="fa-solid fa-circle-check mr-1"></i> Verified on ${escapeHtml(v.emailVerifiedAt)}</span>` : ''}
            </div>

            <!-- OTP Input Box (Shown when code sent) -->
            <div id="email-otp-box" class="hidden mt-4 p-4 bg-orange-50/50 border border-orange-200 rounded-xl space-y-3">
              <label class="block text-xs font-bold text-slate-800">Enter 6-Digit Email Verification Code</label>
              <div class="flex items-center gap-2">
                <input type="text" id="settings-email-otp-input" maxlength="6" placeholder="123456" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono tracking-widest text-center font-bold text-slate-900 outline-none focus:border-orange-500">
                <button onclick="submitSettingsEmailOtp()" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer flex-shrink-0">
                  Verify Code
                </button>
              </div>
              <p class="text-[11px] text-slate-500">Code sent to your inbox. Check spam if not received.</p>
            </div>

            <!-- Change Email Section (Hidden by default) -->
            <div id="email-change-box" class="hidden mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <label class="block text-xs font-bold text-slate-800">Enter New Email Address</label>
              <div class="space-y-2">
                <input type="email" id="settings-new-email-input" placeholder="new.partner@example.com" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-orange-500">
                <button onclick="submitSettingsEmailChangeRequest()" class="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition cursor-pointer">
                  Send Verification Code to New Email
                </button>
              </div>
            </div>

            <!-- Email Change OTP Verification (Hidden by default) -->
            <div id="email-change-verify-box" class="hidden mt-4 p-4 bg-orange-50/50 border border-orange-200 rounded-xl space-y-3">
              <label class="block text-xs font-bold text-slate-800">Verify Code for New Email</label>
              <div class="flex items-center gap-2">
                <input type="text" id="settings-change-email-otp" maxlength="6" placeholder="123456" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono tracking-widest text-center font-bold text-slate-900 outline-none focus:border-orange-500">
                <button onclick="submitSettingsEmailChangeVerify()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer flex-shrink-0">
                  Confirm Change
                </button>
              </div>
            </div>
          </div>

          <div class="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            ${!isEmailVerified ? `
              <button id="btn-send-email-otp" onclick="sendSettingsEmailOtp()" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5">
                <i class="fa-solid fa-paper-plane"></i> Send Verification Code
              </button>
            ` : `
              <span class="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                <i class="fa-solid fa-shield-check"></i> Email is cryptographically verified
              </span>
            `}
            <button onclick="toggleSettingsBox('email-change-box')" class="text-xs text-slate-500 hover:text-orange-600 font-semibold underline cursor-pointer">
              Change Email
            </button>
          </div>
        </div>

        <!-- MOBILE PHONE VERIFICATION CARD -->
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-6 flex flex-col justify-between space-y-5">
          <div>
            <div class="flex items-center justify-between pb-4 border-b border-slate-100">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-xl ${isPhoneVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'} flex items-center justify-center text-lg">
                  <i class="fa-solid fa-mobile-screen"></i>
                </div>
                <div>
                  <h4 class="text-xs font-bold text-slate-900">Mobile Phone Number</h4>
                  <p class="text-[11px] text-slate-400">Direct client consultation dispatch alerts</p>
                </div>
              </div>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isPhoneVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                <i class="fa-solid ${isPhoneVerified ? 'fa-circle-check' : 'fa-clock'} mr-1"></i>
                ${isPhoneVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>

            <div class="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Registered Mobile</span>
              <p class="text-xs font-mono font-bold text-slate-800 mt-0.5">${escapeHtml(phone || 'No phone registered')}</p>
              ${v.phoneVerifiedAt ? `<span class="text-[10px] text-emerald-600 block mt-1"><i class="fa-solid fa-circle-check mr-1"></i> Verified on ${escapeHtml(v.phoneVerifiedAt)}</span>` : ''}
            </div>

            <!-- Phone OTP Input Box -->
            <div id="phone-otp-box" class="hidden mt-4 p-4 bg-orange-50/50 border border-orange-200 rounded-xl space-y-3">
              <label class="block text-xs font-bold text-slate-800">Enter 6-Digit SMS Verification Code</label>
              <div class="flex items-center gap-2">
                <input type="text" id="settings-phone-otp-input" maxlength="6" placeholder="123456" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono tracking-widest text-center font-bold text-slate-900 outline-none focus:border-orange-500">
                <button onclick="submitSettingsPhoneOtp()" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer flex-shrink-0">
                  Verify Phone
                </button>
              </div>
              <p class="text-[11px] text-slate-500">SMS code sent to your mobile handset via BuildBid partner gateway.</p>
            </div>

            <!-- Update Phone Form -->
            <div id="phone-change-box" class="hidden mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <label class="block text-xs font-bold text-slate-800">Enter New Mobile Number</label>
              <div class="space-y-2">
                <div class="flex items-center">
                  <span class="px-3 py-2 bg-slate-100 border border-r-0 border-slate-200 rounded-l-lg text-slate-600 font-mono text-xs">+91</span>
                  <input type="tel" id="settings-new-phone-input" placeholder="9876543210" maxlength="10" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-r-lg text-xs text-slate-800 outline-none focus:border-orange-500">
                </div>
                <button onclick="submitSettingsPhoneChangeRequest()" class="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition cursor-pointer">
                  Send SMS Code to New Mobile
                </button>
              </div>
            </div>
          </div>

          <div class="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            ${!isPhoneVerified ? `
              <button id="btn-send-phone-otp" onclick="sendSettingsPhoneOtp()" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5">
                <i class="fa-solid fa-paper-plane"></i> Send Mobile OTP
              </button>
            ` : `
              <span class="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                <i class="fa-solid fa-shield-check"></i> Mobile number is active & verified
              </span>
            `}
            <button onclick="toggleSettingsBox('phone-change-box')" class="text-xs text-slate-500 hover:text-orange-600 font-semibold underline cursor-pointer">
              Update Number
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function toggleSettingsBox(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('hidden');
}

async function sendSettingsEmailOtp() {
  const token = getCleanToken();
  if (!token) return;

  const btn = document.getElementById('btn-send-email-otp');
  if (btn) btn.disabled = true;

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/verification/email/send-otp`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      showToast(data.message || 'Verification code sent to your email.', 'success');
      const box = document.getElementById('email-otp-box');
      if (box) box.classList.remove('hidden');
      startEmailCooldown(data.cooldownSeconds || 60);
    } else {
      showToast(data.error || 'Could not send verification code.', 'error');
      if (btn) btn.disabled = false;
    }
  } catch (e) {
    showToast('Network error while requesting verification OTP.', 'error');
    if (btn) btn.disabled = false;
  }
}

async function submitSettingsEmailOtp() {
  const token = getCleanToken();
  if (!token) return;

  const input = document.getElementById('settings-email-otp-input');
  const otp = input ? input.value.trim() : '';

  if (!otp || otp.length < 6) {
    showToast('Please enter the 6-digit verification code.', 'warning');
    return;
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/verification/email/verify-otp`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ otp: otp })
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      showToast('Email verified successfully!', 'success');
      currentPro.isVerified = true;
      currentPro.verificationStatus = 'VERIFIED';
      await loadSettingsVerificationAsync();
      syncIdentityWithStoredSession();
      renderAccountSettings(document.getElementById('main-view'));
    } else {
      showToast(data.error || 'Invalid or expired verification code.', 'error');
    }
  } catch (e) {
    showToast('Network error during email verification.', 'error');
  }
}

let pendingNewEmail = '';
async function submitSettingsEmailChangeRequest() {
  const token = getCleanToken();
  if (!token) return;

  const input = document.getElementById('settings-new-email-input');
  const newEmail = input ? input.value.trim() : '';

  if (!newEmail || !newEmail.includes('@')) {
    showToast('Please enter a valid email address.', 'warning');
    return;
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/verification/email/request-change`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ newEmail: newEmail })
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      pendingNewEmail = newEmail;
      showToast(data.message || 'Verification code sent to new email.', 'success');
      const changeBox = document.getElementById('email-change-box');
      const verifyBox = document.getElementById('email-change-verify-box');
      if (changeBox) changeBox.classList.add('hidden');
      if (verifyBox) verifyBox.classList.remove('hidden');
    } else {
      showToast(data.error || 'Could not initiate email change.', 'error');
    }
  } catch (e) {
    showToast('Network error while requesting email change.', 'error');
  }
}

async function submitSettingsEmailChangeVerify() {
  const token = getCleanToken();
  if (!token || !pendingNewEmail) return;

  const input = document.getElementById('settings-change-email-otp');
  const otp = input ? input.value.trim() : '';

  if (!otp || otp.length < 6) {
    showToast('Please enter the 6-digit verification code.', 'warning');
    return;
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/verification/email/verify-change`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ newEmail: pendingNewEmail, otp: otp })
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      showToast('Email updated and verified successfully!', 'success');
      currentPro.email = pendingNewEmail;
      await loadSettingsVerificationAsync();
      syncIdentityWithStoredSession();
      renderAccountSettings(document.getElementById('main-view'));
    } else {
      showToast(data.error || 'Verification code failed.', 'error');
    }
  } catch (e) {
    showToast('Network error during email change confirmation.', 'error');
  }
}

async function sendSettingsPhoneOtp() {
  const token = getCleanToken();
  if (!token) return;

  const btn = document.getElementById('btn-send-phone-otp');
  if (btn) btn.disabled = true;

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/verification/phone/send-otp`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      showToast(data.message || 'SMS verification code sent.', 'success');
      const box = document.getElementById('phone-otp-box');
      if (box) box.classList.remove('hidden');
      startPhoneCooldown(data.cooldownSeconds || 60);
    } else {
      showToast(data.error || 'Could not send phone OTP.', 'error');
      if (btn) btn.disabled = false;
    }
  } catch (e) {
    showToast('Network error during mobile OTP request.', 'error');
    if (btn) btn.disabled = false;
  }
}

async function submitSettingsPhoneOtp() {
  const token = getCleanToken();
  if (!token) return;

  const input = document.getElementById('settings-phone-otp-input');
  const otp = input ? input.value.trim() : '';

  if (!otp || otp.length < 6) {
    showToast('Please enter the 6-digit SMS verification code.', 'warning');
    return;
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/verification/phone/verify-otp`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ otp: otp })
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      showToast('Mobile number verified successfully!', 'success');
      await loadSettingsVerificationAsync();
      syncIdentityWithStoredSession();
      renderAccountSettings(document.getElementById('main-view'));
    } else {
      showToast(data.error || 'Invalid or expired phone verification code.', 'error');
    }
  } catch (e) {
    showToast('Network error verifying mobile code.', 'error');
  }
}

let pendingNewPhone = '';
async function submitSettingsPhoneChangeRequest() {
  const token = getCleanToken();
  if (!token) return;

  const input = document.getElementById('settings-new-phone-input');
  const newPhone = input ? input.value.trim() : '';

  if (!newPhone || newPhone.length < 10) {
    showToast('Please enter a valid 10-digit mobile number.', 'warning');
    return;
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/verification/phone/send-otp`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ phone: newPhone })
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      pendingNewPhone = newPhone;
      showToast(data.message || 'Verification code sent to new mobile.', 'success');
      const changeBox = document.getElementById('phone-change-box');
      const otpBox = document.getElementById('phone-otp-box');
      if (changeBox) changeBox.classList.add('hidden');
      if (otpBox) otpBox.classList.remove('hidden');
    } else {
      showToast(data.error || 'Could not send verification code.', 'error');
    }
  } catch (e) {
    showToast('Network error requesting phone verification.', 'error');
  }
}

function startEmailCooldown(sec) {
  settingsEmailCooldownSec = sec;
  clearInterval(settingsEmailCooldownTimer);
  const btn = document.getElementById('btn-send-email-otp');
  if (!btn) return;
  btn.disabled = true;
  settingsEmailCooldownTimer = setInterval(() => {
    settingsEmailCooldownSec--;
    if (settingsEmailCooldownSec <= 0) {
      clearInterval(settingsEmailCooldownTimer);
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-paper-plane mr-1"></i> Resend Code`;
    } else {
      btn.innerHTML = `<i class="fa-solid fa-clock mr-1"></i> Resend (${settingsEmailCooldownSec}s)`;
    }
  }, 1000);
}

function startPhoneCooldown(sec) {
  settingsPhoneCooldownSec = sec;
  clearInterval(settingsPhoneCooldownTimer);
  const btn = document.getElementById('btn-send-phone-otp');
  if (!btn) return;
  btn.disabled = true;
  settingsPhoneCooldownTimer = setInterval(() => {
    settingsPhoneCooldownSec--;
    if (settingsPhoneCooldownSec <= 0) {
      clearInterval(settingsPhoneCooldownTimer);
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-paper-plane mr-1"></i> Resend OTP`;
    } else {
      btn.innerHTML = `<i class="fa-solid fa-clock mr-1"></i> Resend (${settingsPhoneCooldownSec}s)`;
    }
  }, 1000);
}

/* --- TAB 3: SECURITY & LOGIN --- */
function renderSettingsSecurityTab(container) {
  let cachedUser = null;
  try {
    const raw = localStorage.getItem("currentUser") || localStorage.getItem("marketplaceUser");
    if (raw) cachedUser = JSON.parse(raw);
  } catch (e) { }

  const email = (cachedUser && cachedUser.email) || currentPro.email || "partner@buildbid.com";
  const passUpdate = (cachedUser && cachedUser.passwordUpdatedAt) ? new Date(cachedUser.passwordUpdatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Original Sign-up';

  container.innerHTML = `
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-6 sm:p-8 space-y-6">
      <div class="border-b border-slate-100 pb-5">
        <h3 class="text-base font-bold text-slate-900">Security Credentials & Active Sessions</h3>
        <p class="text-xs text-slate-500 mt-1">Review active cryptographic keys, stateless authentication session security, and account access protection.</p>
      </div>

      <!-- Security Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div class="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
          <div class="flex items-center space-x-3 text-slate-700 mb-2">
            <i class="fa-solid fa-key text-orange-600 text-base"></i>
            <h4 class="text-xs font-bold text-slate-900">Password Security</h4>
          </div>
          <p class="text-xs text-slate-600">Salted BCrypt hashing on file.</p>
          <span class="text-[11px] text-slate-400 mt-2 block">Last updated: <strong>${escapeHtml(passUpdate)}</strong></span>
        </div>

        <div class="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
          <div class="flex items-center space-x-3 text-slate-700 mb-2">
            <i class="fa-solid fa-shield-halved text-emerald-600 text-base"></i>
            <h4 class="text-xs font-bold text-slate-900">Session Protection</h4>
          </div>
          <p class="text-xs text-slate-600">Stateless JWT authorization with server-side validation.</p>
          <span class="text-[11px] text-emerald-600 font-semibold mt-2 block"><i class="fa-solid fa-circle-check mr-1"></i> Active Session Encrypted</span>
        </div>

        <div class="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
          <div class="flex items-center space-x-3 text-slate-700 mb-2">
            <i class="fa-solid fa-fingerprint text-blue-600 text-base"></i>
            <h4 class="text-xs font-bold text-slate-900">Multi-Factor Shield</h4>
          </div>
          <p class="text-xs text-slate-600">Dual-channel OTP verification enabled via Email & SMS.</p>
          <span class="text-[11px] text-slate-400 mt-2 block">Gateway: BuildBid Cryptographic Auth</span>
        </div>
      </div>

      <!-- Transparency & Policy Notice -->
      <div class="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-slate-700 space-y-2">
        <div class="flex items-center space-x-2 font-bold text-blue-900">
          <i class="fa-solid fa-circle-info text-blue-600"></i>
          <span>Professional Credential Reset Notice</span>
        </div>
        <p class="leading-relaxed text-slate-600">
          In compliance with BuildBid partner escrow security, direct password modification endpoints (<code class="bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-mono text-[11px]">/api/customer/security/password</code>) are restricted exclusively to Customer role accounts on this server. To reset or update your professional authentication password, please use the self-service credential recovery workflow on the login page or contact dedicated partner support.
        </p>
      </div>

      <!-- Active Device Session -->
      <div class="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between flex-wrap gap-4">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-slate-200/70 flex items-center justify-center text-slate-700 text-base">
            <i class="fa-solid fa-laptop"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-slate-900">Current Active Device Session</h4>
            <p class="text-[11px] text-slate-500 font-mono">Authenticated via: ${escapeHtml(email)}</p>
          </div>
        </div>
        <button onclick="executeLogout()" class="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
          <i class="fa-solid fa-arrow-right-from-bracket"></i> Sign Out from this Device
        </button>
      </div>
    </div>
  `;
}

/* --- TAB 4: PROFESSIONAL PREFERENCES --- */
function renderSettingsPreferencesTab(container) {
  const pro = currentPro || {};
  const currentRadius = pro.serviceRadius || 25;
  const isAvailable = pro.available !== false;

  container.innerHTML = `
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-6 sm:p-8 space-y-6">
      <div class="border-b border-slate-100 pb-5">
        <h3 class="text-base font-bold text-slate-900">Professional Preferences & Dispatch Territory</h3>
        <p class="text-xs text-slate-500 mt-1">Configure consultation availability, dispatch radius, and workspace preferences.</p>
      </div>

      <div class="space-y-6 text-xs">
        <!-- Direct Consultations Toggle -->
        <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <h4 class="font-bold text-slate-900">Accepting Direct Client Consultations</h4>
            <p class="text-slate-500 text-[11px] mt-0.5">When active, your profile is discoverable in direct hire search and clients can initiate inquiries.</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="settings-pref-available" ${isAvailable ? 'checked' : ''} class="sr-only peer">
            <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        <!-- Service Area Radius Selection -->
        <div>
          <label class="block font-semibold text-slate-700 mb-2">Maximum Dispatch & Travel Radius</label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            ${[10, 25, 50, 100].map(km => `
              <label class="flex items-center p-3 rounded-xl border ${currentRadius === km ? 'border-orange-500 bg-orange-50/40 text-orange-950 font-bold' : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold'} cursor-pointer transition">
                <input type="radio" name="settings-radius" value="${km}" ${currentRadius === km ? 'checked' : ''} class="mr-2 text-orange-600 focus:ring-orange-500">
                <span>${km} km Radius</span>
              </label>
            `).join('')}
          </div>
          <p class="text-[11px] text-slate-400 mt-1.5">Lead matching filters client inquiries according to this territory radius.</p>
        </div>

        <!-- Consultation Modes -->
        <div>
          <label class="block font-semibold text-slate-700 mb-2">Accepted Consultation Modes</label>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label class="flex items-center p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" checked class="mr-2.5 rounded text-orange-600 focus:ring-orange-500">
              <div>
                <span class="font-bold text-slate-800 block">On-Site Inspections</span>
                <span class="text-[10px] text-slate-400">Physical visits to job sites</span>
              </div>
            </label>
            <label class="flex items-center p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" checked class="mr-2.5 rounded text-orange-600 focus:ring-orange-500">
              <div>
                <span class="font-bold text-slate-800 block">Virtual Consultation</span>
                <span class="text-[10px] text-slate-400">Video call & drawing review</span>
              </div>
            </label>
            <label class="flex items-center p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" checked class="mr-2.5 rounded text-orange-600 focus:ring-orange-500">
              <div>
                <span class="font-bold text-slate-800 block">Emergency Visits</span>
                <span class="text-[10px] text-slate-400">Urgent structural assessments</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Deep-dive Shortcuts -->
        <div class="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-2">
            <button onclick="navigate('services')" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-toolbox text-slate-500"></i> Services Catalog
            </button>
            <button onclick="navigate('documents')" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-shield-halved text-slate-500"></i> Regulatory Documents
            </button>
          </div>
          <button onclick="saveProfessionalPreferences()" class="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer">
            <i class="fa-solid fa-floppy-disk"></i> Save Preferences
          </button>
        </div>
      </div>
    </div>
  `;
}

function saveProfessionalPreferences() {
  const availInput = document.getElementById('settings-pref-available');
  const radiusInput = document.querySelector('input[name="settings-radius"]:checked');

  if (availInput) currentPro.available = availInput.checked;
  if (radiusInput) currentPro.serviceRadius = parseInt(radiusInput.value, 10);

  try {
    const raw = localStorage.getItem('currentUser') || localStorage.getItem('marketplaceUser');
    let u = raw ? JSON.parse(raw) : {};
    u.available = currentPro.available;
    u.serviceRadius = currentPro.serviceRadius;
    localStorage.setItem('currentUser', JSON.stringify(u));
  } catch (e) { }

  showToast('Professional preferences saved successfully.', 'success');
}

/* --- TAB 5: NOTIFICATIONS & REGIONAL --- */
function renderSettingsNotificationsTab(container) {
  container.innerHTML = `
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-6 sm:p-8 space-y-6">
      <div class="border-b border-slate-100 pb-5 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h3 class="text-base font-bold text-slate-900">Notifications & Regional Language Preferences</h3>
          <p class="text-xs text-slate-500 mt-1">Configure notification delivery frequency and display localization.</p>
        </div>
        <button onclick="markAllSettingsNotificationsRead()" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer">
          <i class="fa-solid fa-check-double text-slate-500"></i> Mark All Notifications Read
        </button>
      </div>

      <div class="space-y-5 text-xs">
        <div>
          <h4 class="font-bold text-slate-900 mb-2">Notification Delivery Channels</h4>
          <div class="space-y-3">
            <label class="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
              <div>
                <span class="font-bold text-slate-800 block">In-App Lead Alerts</span>
                <span class="text-[11px] text-slate-500">Real-time alerts for incoming client requests and requirement postings.</span>
              </div>
              <input type="checkbox" checked class="rounded text-orange-600 focus:ring-orange-500 w-4 h-4">
            </label>

            <label class="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
              <div>
                <span class="font-bold text-slate-800 block">Milestone Payment Notices</span>
                <span class="text-[11px] text-slate-500">Instant SMS and email notifications upon escrow funding and release.</span>
              </div>
              <input type="checkbox" checked class="rounded text-orange-600 focus:ring-orange-500 w-4 h-4">
            </label>

            <label class="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
              <div>
                <span class="font-bold text-slate-800 block">Weekly Performance Digest</span>
                <span class="text-[11px] text-slate-500">Summary of client profile views, active contracts, and rating updates.</span>
              </div>
              <input type="checkbox" checked class="rounded text-orange-600 focus:ring-orange-500 w-4 h-4">
            </label>
          </div>
        </div>

        <div class="pt-4 border-t border-slate-100">
          <h4 class="font-bold text-slate-900 mb-2">Regional & Display Settings</h4>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Preferred Language</label>
              <select class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none">
                <option value="en" selected>English (Primary)</option>
                <option value="hi">हिंदी (Hindi)</option>
              </select>
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Currency Format</label>
              <input type="text" value="₹ INR (Indian Rupee)" readonly class="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 cursor-not-allowed">
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Marketplace Timezone</label>
              <input type="text" value="IST (UTC+5:30) New Delhi" readonly class="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 cursor-not-allowed">
            </div>
          </div>
        </div>

        <div class="pt-4 border-t border-slate-100 flex justify-end">
          <button onclick="showToast('Notification and regional preferences saved.', 'success')" class="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer">
            <i class="fa-solid fa-floppy-disk"></i> Save Preferences
          </button>
        </div>
      </div>
    </div>
  `;
}

async function markAllSettingsNotificationsRead() {
  const token = getCleanToken();
  if (!token) return;

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/notifications/mark-all-read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (res.ok) {
      showToast('All notifications marked as read.', 'success');
      const badge = document.getElementById('notif-badge');
      if (badge) badge.classList.add('hidden');
    }
  } catch (e) {
    showToast('Failed to update notifications.', 'error');
  }
}

/* --- TAB 6: ACCOUNT DATA & LIFECYCLE --- */
function renderSettingsLifecycleTab(container) {
  container.innerHTML = `
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-6 sm:p-8 space-y-6">
      <div class="border-b border-slate-100 pb-5">
        <h3 class="text-base font-bold text-slate-900">Account Data Governance & Partner Lifecycle</h3>
        <p class="text-xs text-slate-500 mt-1">Review BuildBid regulatory data isolation, statement records, and partner account deactivation terms.</p>
      </div>

      <div class="space-y-6 text-xs">
        <!-- Account Data Export -->
        <div class="p-5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center space-x-3">
              <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
                <i class="fa-solid fa-file-invoice-dollar"></i>
              </div>
              <div>
                <h4 class="font-bold text-slate-900">Escrow Statements & Financial Records</h4>
                <p class="text-slate-500 text-[11px]">Download verified earnings statements, client invoices, and transaction histories.</p>
              </div>
            </div>
            <button onclick="navigate('earnings')" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-wallet"></i> View Statements
            </button>
          </div>
          <p class="text-[11px] text-slate-400">
            Note: Customer-specific data export (<code class="font-mono text-slate-600">/api/customer/download-data</code>) is restricted to Customer accounts. Service Provider and Professional transaction ledgers are fully accessible under the dedicated <a href="javascript:void(0)" onclick="navigate('earnings')" class="text-orange-600 hover:underline font-semibold">Earnings & Payments</a> console.
          </p>
        </div>

        <!-- Account Deactivation Policy -->
        <div class="p-5 bg-rose-50/50 rounded-xl border border-rose-200/80 space-y-3">
          <div class="flex items-start justify-between flex-wrap gap-4">
            <div class="flex items-start space-x-3">
              <div class="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                <i class="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div>
                <h4 class="font-bold text-slate-900">Partner Account Closure & Deactivation Protocol</h4>
                <p class="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                  To protect ongoing construction works and client escrow deposits, Professional accounts cannot be deleted self-service while active service contracts or pending milestones exist.
                </p>
              </div>
            </div>
            <button onclick="showToast('Helpline 1800-BUILDBID: Dedicated Partner support ready.', 'info')" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5 flex-shrink-0">
              <i class="fa-solid fa-phone"></i> Contact Partner Helpline
            </button>
          </div>
          <div class="p-3 bg-white/70 rounded-lg border border-rose-200/50 text-[11px] text-slate-500">
            <strong>Deactivation Policy Requirements:</strong>
            <ul class="list-disc list-inside mt-1 space-y-0.5">
              <li>All active project works must be formally completed or handed over.</li>
              <li>Escrow milestones must have zero pending disputes.</li>
              <li>Unpublished services will be archived from the BuildBid master catalog.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function syncSettingsWithServer() {
  showToast('Synchronizing account credentials with server...', 'info');
  await fetchAndUpdateProfile();
  await loadSettingsVerificationAsync();
  renderAccountSettings(document.getElementById('main-view'));
  showToast('Account data synchronized successfully.', 'success');
}

function renderDocuments(container) {
  const hasDocs = Array.isArray(currentPro.documents) && currentPro.documents.length > 0;

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

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        ${!hasDocs ? `
          <div class="col-span-1 md:col-span-2 p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-white">
            <i class="fa-solid fa-file-circle-question text-slate-300 text-3xl mb-3 block"></i>
            <p class="font-semibold text-slate-700">No credentials or licenses uploaded yet.</p>
            <p class="mt-1 text-slate-400">Upload your government ID, trade license, or academic degree to earn verified professional status.</p>
          </div>
        ` : currentPro.documents.map(doc => `
          <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-5 flex items-start justify-between">
            <div class="flex items-start space-x-4">
              <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
                <i class="fa-solid fa-file-shield"></i>
              </div>
              <div>
                <h4 class="text-xs font-bold text-slate-900">${escapeHtml(doc.title || 'Credential')}</h4>
                <p class="text-[11px] text-slate-500">Authority: ${escapeHtml(doc.issuer || 'Regulatory Board')}</p>
                <p class="text-xs font-mono text-slate-700 mt-1">ID Number: <strong>${escapeHtml(doc.idNumber || 'On file')}</strong></p>
                <span class="text-[10px] text-slate-400 mt-0.5 block">Approved: ${escapeHtml(doc.date || 'Active')}</span>
              </div>
            </div>
            <div class="flex flex-col items-end space-y-2">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${(doc.status || '').toLowerCase() === 'verified' ? 'bg-emerald-100 text-emerald-800' :
      (doc.status || '').toLowerCase() === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
    }">${escapeHtml(doc.status || 'Verified')}</span>
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
  const req = (currentPro.requests || []).find(r =>
    String(r.id) === String(reqId) ||
    String(r.requestId) === String(reqId) ||
    (r.numericId && String(r.numericId) === String(reqId))
  );
  if (!req) return;

  const body = document.getElementById('modal-request-body');
  if (!body) return;

  const statusLower = (req.status || '').toLowerCase();

  body.innerHTML = `
    <div class="space-y-4 text-xs">
      <!-- Header meta strip -->
      <div class="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div class="space-y-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-mono font-bold text-slate-800 text-xs">${escapeHtml(req.requestId || req.id)}</span>
            ${getRequestTypeBadge(req.requestType)}
            ${getRequestStatusBadge(req.status)}
          </div>
          <h4 class="text-sm font-bold text-slate-900 mt-1">${escapeHtml(req.projectName || req.project)}</h4>
          <span class="text-[11px] font-semibold text-orange-600 uppercase tracking-wider">${escapeHtml(req.requestedService || req.service)}</span>
        </div>
        <div class="text-left sm:text-right">
          <span class="text-slate-400 block text-[10px]">Estimated Budget</span>
          <span class="text-base font-extrabold text-slate-900">${escapeHtml(req.budget || '--')}</span>
        </div>
      </div>

      <!-- Requester Identity Card -->
      <div class="p-4 border border-slate-200/90 rounded-xl bg-white space-y-2.5">
        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
          <span class="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
            <i class="fa-solid fa-id-card text-orange-600"></i>
            Requester Identity
          </span>
          ${getRequesterRoleBadge(req.requesterRole)}
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span class="text-slate-400 block text-[10px]">Name</span>
            <span class="font-bold text-slate-900 text-xs">${escapeHtml(req.requesterName || req.customer || 'Client')}</span>
          </div>
          <div>
            <span class="text-slate-400 block text-[10px]">Role</span>
            <span class="font-semibold text-slate-800 text-xs">${escapeHtml(formatRequesterRole(req.requesterRole))}</span>
          </div>
          <div>
            <span class="text-slate-400 block text-[10px]">Phone Number</span>
            ${req.requesterPhone ? `
              <a href="tel:${escapeHtml(req.requesterPhone)}" class="text-orange-600 hover:text-orange-700 font-semibold text-xs inline-flex items-center gap-1">
                <i class="fa-solid fa-phone text-[10px]"></i>
                ${escapeHtml(req.requesterPhone)}
              </a>
            ` : `
              <span class="text-slate-400 italic text-xs">Not provided</span>
            `}
          </div>
          <div>
            <span class="text-slate-400 block text-[10px]">Requester Location</span>
            <span class="text-slate-700 font-medium text-xs">
              <i class="fa-solid fa-location-dot text-[10px] text-slate-400"></i>
              ${escapeHtml(req.requesterLocation || req.location || 'Local')}
            </span>
          </div>
        </div>
      </div>

      <!-- Project Details Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div class="p-3 border border-slate-200 rounded-xl">
          <span class="text-slate-400 block text-[10px]">Work Location</span>
          <span class="font-bold text-slate-800 text-xs">${escapeHtml(req.location || 'Local')}${req.distance ? ` (${escapeHtml(req.distance)})` : ''}</span>
        </div>
        <div class="p-3 border border-slate-200 rounded-xl">
          <span class="text-slate-400 block text-[10px]">Target Date</span>
          <span class="font-bold text-slate-800 text-xs">${escapeHtml(req.date || '--')}</span>
        </div>
        <div class="p-3 border border-slate-200 rounded-xl col-span-2 sm:col-span-1">
          <span class="text-slate-400 block text-[10px]">Requested On</span>
          <span class="font-bold text-slate-800 text-xs">${escapeHtml(req.createdAt ? new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : (req.date || '--'))}</span>
        </div>
      </div>

      <!-- Scope of Work / Requirements -->
      <div>
        <h5 class="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
          <i class="fa-solid fa-file-lines text-slate-400"></i>
          Project Scope & Requirements
        </h5>
        <div class="text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100 max-h-40 overflow-y-auto whitespace-pre-line">
          ${escapeHtml(req.projectScope || req.desc || 'No additional scope details provided.')}
        </div>
      </div>

      <!-- Escrow Note -->
      <div class="p-3 bg-blue-50 rounded-xl text-blue-800 text-[11px] flex items-center space-x-2 border border-blue-100">
        <i class="fa-solid fa-shield text-blue-600 text-xs"></i>
        <span>BuildBid Escrow Protection: Client engagement terms and payment milestones are tracked securely under platform escrow.</span>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-between pt-3 border-t border-slate-100">
        <div>
          ${statusLower === 'accepted' ? `
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <i class="fa-solid fa-circle-check"></i> Request Accepted
            </span>
          ` : statusLower === 'declined' ? `
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
              <i class="fa-solid fa-circle-xmark"></i> Request Declined
            </span>
          ` : ''}
        </div>
        <div class="flex items-center gap-2">
          <button onclick="closeModal('modal-request-detail')" class="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition">
            Close
          </button>
          ${statusLower === 'new' ? `
            <button onclick="promptDecline('${escapeHtml(req.id)}')" class="px-4 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl font-semibold transition">
              Decline
            </button>
            <button onclick="acceptRequest('${escapeHtml(req.id)}')" class="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold shadow-xs transition">
              Accept Request
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
  openModal('modal-request-detail');
}

async function acceptRequest(reqId) {
  const token = getCleanToken();
  if (!token) {
    showToast('Please log in to accept requests.', 'error');
    return;
  }

  const req = (currentPro.requests || []).find(x =>
    String(x.id) === String(reqId) ||
    String(x.requestId) === String(reqId) ||
    (x.numericId && String(x.numericId) === String(reqId))
  );
  const targetId = (req && req.numericId) ? req.numericId : reqId;

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/professional/requests/${encodeURIComponent(targetId)}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ status: 'Accepted' })
    });

    if (res.ok) {
      showToast(`Request #${targetId} accepted successfully!`, 'success');
      closeModal('modal-request-detail');
      await fetchAndUpdateRequests();
      await fetchAndUpdateActiveWorks();
    } else {
      let errData = {};
      try { errData = await res.json(); } catch (_) { }
      showToast(errData.error || errData.message || `Failed to accept request (Status ${res.status}).`, 'error');
    }
  } catch (err) {
    console.error("Error accepting request:", err);
    showToast('Network error: Could not accept request.', 'error');
  }
}

function promptDecline(reqId) {
  const req = (currentPro.requests || []).find(x =>
    String(x.id) === String(reqId) ||
    String(x.requestId) === String(reqId) ||
    (x.numericId && String(x.numericId) === String(reqId))
  );
  const targetId = (req && req.numericId) ? req.numericId : reqId;

  const confirmBtn = document.getElementById('confirm-action-btn');
  const titleEl = document.getElementById('confirm-title');
  const msgEl = document.getElementById('confirm-msg');
  if (titleEl) titleEl.innerText = "Decline Service Request?";
  if (msgEl) msgEl.innerText = `Are you sure you want to decline request #${targetId}? The client will be notified.`;

  if (confirmBtn) {
    confirmBtn.onclick = async () => {
      confirmBtn.disabled = true;
      const token = getCleanToken();
      if (!token) {
        showToast('Please log in to decline requests.', 'error');
        confirmBtn.disabled = false;
        closeModal('modal-confirm');
        return;
      }

      try {
        const res = await fetch(`${getApiBaseUrl()}/api/professional/requests/${encodeURIComponent(targetId)}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ status: 'Declined' })
        });

        confirmBtn.disabled = false;
        closeModal('modal-confirm');
        closeModal('modal-request-detail');

        if (res.ok) {
          showToast(`Request #${targetId} has been declined.`, 'info');
          await fetchAndUpdateRequests();
        } else {
          let errData = {};
          try { errData = await res.json(); } catch (_) { }
          showToast(errData.error || errData.message || `Failed to decline request (Status ${res.status}).`, 'error');
        }
      } catch (err) {
        confirmBtn.disabled = false;
        closeModal('modal-confirm');
        console.error("Error declining request:", err);
        showToast('Network error: Could not decline request.', 'error');
      }
    };
  }
  openModal('modal-confirm');
}

function openProposalModal(projectId, tradeRole, defaultOfferAmount, defaultOfferType) {
  const req = (liveFindWorkRequirements || []).find(r => String(r.projectId) === String(projectId));
  const descEl = document.getElementById('proposal-target-desc');
  const projInput = document.getElementById('prop-project-id');
  const tradeSelect = document.getElementById('prop-trade-role');
  const amtInput = document.getElementById('prop-amt');
  const rateTypeSelect = document.getElementById('prop-rate-type');
  const teamSizeInput = document.getElementById('prop-team-size');
  const durationInput = document.getElementById('prop-duration');
  const notesInput = document.getElementById('prop-notes');

  if (projInput) projInput.value = projectId || '';
  if (descEl) {
    if (req) {
      descEl.innerText = `${req.projectTitle || 'Post Requirement'} • ${req.location || 'Location upon request'}`;
    } else {
      descEl.innerText = projectId ? `Requirement #${projectId}` : 'Send Proposal';
    }
  }

  // Populate eligible trade select
  if (tradeSelect) {
    tradeSelect.innerHTML = '';
    const trades = (req && req.tradeRequirements) ? req.tradeRequirements : [];
    const eligibleTrades = trades.filter(t => t.eligible);
    const availableTrades = eligibleTrades.length > 0 ? eligibleTrades : trades;

    if (availableTrades.length === 0) {
      const opt = document.createElement('option');
      opt.value = tradeRole || (currentPro ? currentPro.type : 'Professional');
      opt.innerText = opt.value;
      tradeSelect.appendChild(opt);
    } else {
      availableTrades.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.tradeRole;
        const remText = t.remainingQuantity !== undefined ? ` (Remaining: ${t.remainingQuantity})` : '';
        opt.innerText = `${t.tradeRole}${remText}`;
        if (tradeRole && t.tradeRole.toLowerCase() === tradeRole.toLowerCase()) {
          opt.selected = true;
        }
        tradeSelect.appendChild(opt);
      });
    }

    if (tradeRole) {
      tradeSelect.value = tradeRole;
    }
  }

  // Prefill proposed rate if offer amount is present
  if (amtInput) {
    amtInput.value = (defaultOfferAmount && Number(defaultOfferAmount) > 0) ? defaultOfferAmount : '';
  }

  // Rate type
  if (rateTypeSelect) {
    if (defaultOfferType) {
      const norm = defaultOfferType.toUpperCase();
      if (norm.includes('DAY')) rateTypeSelect.value = 'PER_DAY';
      else if (norm.includes('LUMP') || norm.includes('PROJECT')) rateTypeSelect.value = 'LUMP_SUM';
      else if (norm.includes('MONTH')) rateTypeSelect.value = 'PER_MONTH';
      else if (norm.includes('HOUR')) rateTypeSelect.value = 'PER_HOUR';
      else if (norm.includes('SQ')) rateTypeSelect.value = 'PER_SQFT';
      else rateTypeSelect.value = 'PER_DAY';
    } else {
      rateTypeSelect.value = 'PER_DAY';
    }
  }

  if (teamSizeInput) teamSizeInput.value = 1;
  if (durationInput) durationInput.value = '';
  if (notesInput) notesInput.value = '';

  openModal('modal-proposal');
}

async function handleProposalSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();

  const token = getCleanToken();
  if (!token) {
    showToast('Please log in as a professional to submit proposals.', 'error');
    return;
  }

  const projectId = document.getElementById('prop-project-id')?.value;
  const tradeRole = document.getElementById('prop-trade-role')?.value?.trim();
  const amtVal = document.getElementById('prop-amt')?.value;
  const proposedRate = parseFloat(amtVal);
  const rateType = document.getElementById('prop-rate-type')?.value?.trim() || 'PER_DAY';
  const teamSizeVal = document.getElementById('prop-team-size')?.value;
  const teamSize = parseInt(teamSizeVal, 10) || 1;
  const estimatedDuration = document.getElementById('prop-duration')?.value?.trim() || '';
  const coverMessage = document.getElementById('prop-notes')?.value?.trim() || '';

  if (!projectId) {
    showToast('Missing requirement reference. Please try again.', 'error');
    return;
  }
  if (!tradeRole) {
    showToast('Please select your trade role.', 'error');
    return;
  }
  if (isNaN(proposedRate) || proposedRate <= 0) {
    showToast('Please enter a valid quotation rate greater than zero.', 'error');
    return;
  }
  if (teamSize < 1) {
    showToast('Team size must be at least 1.', 'error');
    return;
  }

  const submitBtn = document.getElementById('prop-submit-btn');
  const originalBtnHtml = submitBtn ? submitBtn.innerHTML : 'Submit Quotation';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/professional/requirements/${encodeURIComponent(projectId)}/apply`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        tradeRole: tradeRole,
        proposedRate: proposedRate,
        rateType: rateType,
        teamSize: teamSize,
        estimatedDuration: estimatedDuration,
        coverMessage: coverMessage
      })
    });

    if (res.ok) {
      showToast('Quotation submitted successfully! The client will review your proposal.', 'success');
      closeModal('modal-proposal');
      closeModal('modal-requirement-detail');
      await fetchFindWorkRequirements();
    } else {
      let errData = {};
      try { errData = await res.json(); } catch (_) { }
      const errMsg = errData.error || errData.message || '';

      if (res.status === 409) {
        if (errMsg.toLowerCase().includes('fulfilled') || errMsg.toLowerCase().includes('capacity') || errMsg.toLowerCase().includes('filled')) {
          showToast('This trade requirement has already been filled. Please refresh the opportunities to view the latest status.', 'error');
        } else if (errMsg.toLowerCase().includes('already')) {
          showToast('You have already submitted an application for this requirement.', 'info');
        } else {
          showToast(errMsg || 'Quotation conflict: unable to submit.', 'error');
        }
        closeModal('modal-proposal');
        await fetchFindWorkRequirements();
      } else if (res.status === 400) {
        showToast(errMsg || 'Invalid quotation data. Please review your inputs.', 'error');
      } else if (res.status === 401) {
        showToast('Session expired. Please log in again.', 'error');
      } else if (res.status === 403) {
        showToast(errMsg || 'Access denied. You can only apply for trades matching your verified services.', 'error');
      } else if (res.status === 404) {
        showToast('This requirement is no longer available.', 'error');
        closeModal('modal-proposal');
        await fetchFindWorkRequirements();
      } else {
        showToast(errMsg || `Failed to submit quotation (Status ${res.status}).`, 'error');
      }
    }
  } catch (err) {
    console.error('Error submitting proposal:', err);
    showToast('Network error: Could not submit quotation. Please check your connection.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  }
}

function handleNewService(e) {
  if (e && e.preventDefault) e.preventDefault();
  window.location.href = 'add-new-service.html';
}

async function toggleServiceActive(id) {
  const token = getCleanToken();
  if (token) {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/professional/services/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        const updated = await res.json();
        showToast(`Service "${updated.serviceTitleEn || ''}" is now ${updated.active ? 'active' : 'hidden'}`, 'info');
        if (Array.isArray(currentPro.services)) {
          const idx = currentPro.services.findIndex(x => x.id === id);
          if (idx !== -1) currentPro.services[idx] = updated;
          updateProHeroServicesUI(currentPro.services);
        }
        navigate('services');
        return;
      }
    } catch (e) {
      console.warn("API toggle error:", e);
    }
  }
  const s = currentPro.services.find(x => x.id === id);
  if (s) {
    s.active = !s.active;
    showToast(`Service "${s.name}" is now ${s.active ? 'active' : 'hidden'}`, 'info');
    navigate('services');
  }
}

async function deleteService(id) {
  if (!confirm("Are you sure you want to remove this service from your catalog? / क्या आप वाकई इस सेवा को हटाना चाहते हैं?")) {
    return;
  }
  const token = getCleanToken();
  if (token) {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/professional/services/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        showToast('Service removed from catalog — सेवा सफलतापूर्वक हटा दी गई', 'info');
        currentPro.services = (currentPro.services || []).filter(x => x.id !== id);
        updateProHeroServicesUI(currentPro.services);
        navigate('services');
        return;
      }
    } catch (e) {
      console.warn("API delete error:", e);
    }
  }
  currentPro.services = (currentPro.services || []).filter(x => x.id !== id);
  updateProHeroServicesUI(currentPro.services);
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
    executeLogout();
  };
  openModal('modal-confirm');
}

window.addEventListener('DOMContentLoaded', () => {
  // Synchronously sync identity from stored session (zero flash)
  syncIdentityWithStoredSession();

  // Initialize sidebar request badge from cached/current state
  updateSidebarRequestBadge();

  // Asynchronously fetch fresh profile from backend
  fetchAndUpdateProfile();

  // Asynchronously fetch fresh client requests from backend
  fetchAndUpdateRequests();

  // Asynchronously fetch fresh notifications from backend
  fetchAndUpdateNotifications();

  // Asynchronously fetch fresh requirement leads from backend (STEP 9)
  fetchFindWorkRequirements();

  // Asynchronously fetch accepted active works from backend
  fetchAndUpdateActiveWorks();

  // Asynchronously fetch counts for Professional Material Requests & Orders
  fetchProfessionalRequestsCount();
  fetchProfessionalOrdersCount();

  const hash = (window.location.hash || '').replace('#', '').trim();
  const validRoutes = ['dashboard', 'find-work', 'requests', 'projects', 'schedule', 'earnings', 'services', 'portfolio', 'profile', 'documents', 'availability', 'messages', 'reviews', 'my-requests', 'my-orders', 'settings', 'account-settings'];
  if (hash && validRoutes.includes(hash)) {
    navigate(hash);
  } else {
    navigate('dashboard');
  }
});



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

/* =========================================================
   PROFESSIONAL — MY REQUESTS & MY ORDERS MODULE
   ========================================================= */

let professionalRequests = [];
let isProfessionalRequestsLoading = false;
let professionalRequestsError = null;
let proRequestSearchQuery = "";
let proRequestTypeFilter = "ALL";
let proRequestStatusFilter = "ALL";

let professionalOrders = [];
let isProfessionalOrdersLoading = false;
let professionalOrdersError = null;
let proOrderSearchQuery = "";
let proOrderStatusFilter = "ALL";

async function fetchProfessionalRequestsCount() {
  const token = getCleanToken();
  if (!token) return;
  try {
    const baseUrl = getApiBaseUrl();
    let res = await fetch(`${baseUrl}/api/professional/my-requests`, {
      headers: { "Authorization": "Bearer " + token, "Accept": "application/json" }
    });
    if (!res.ok) {
      res = await fetch(`${baseUrl}/api/customer/my-requests`, {
        headers: { "Authorization": "Bearer " + token, "Accept": "application/json" }
      });
    }
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        professionalRequests = data;
        updateProfessionalMyRequestsBadge();
      }
    }
  } catch (e) {
    console.warn("Could not fetch professional requests count:", e);
  }
}

async function fetchProfessionalOrdersCount() {
  const token = getCleanToken();
  if (!token) return;
  try {
    const baseUrl = getApiBaseUrl();
    let res = await fetch(`${baseUrl}/api/material-orders/professional`, {
      headers: { "Authorization": "Bearer " + token, "Accept": "application/json" }
    });
    if (!res.ok) {
      res = await fetch(`${baseUrl}/api/material-orders/buyer`, {
        headers: { "Authorization": "Bearer " + token, "Accept": "application/json" }
      });
    }
    if (!res.ok) {
      res = await fetch(`${baseUrl}/api/material-orders/customer`, {
        headers: { "Authorization": "Bearer " + token, "Accept": "application/json" }
      });
    }
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        professionalOrders = data.filter(o => isProfessionalAcceptedOrderStatus(o.orderStatus || o.status));
        updateProfessionalMyOrdersBadge();
      }
    }
  } catch (e) {
    console.warn("Could not fetch professional orders count:", e);
  }
}

function updateProfessionalMyRequestsBadge() {
  const badge = document.getElementById('side-my-req-badge');
  if (!badge) return;
  const count = professionalRequests.length;
  if (count > 0) {
    badge.textContent = `${count}`;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function updateProfessionalMyOrdersBadge() {
  const badge = document.getElementById('side-my-orders-badge');
  if (!badge) return;
  const count = professionalOrders.length;
  if (count > 0) {
    badge.textContent = `${count}`;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function isProfessionalAcceptedOrderStatus(status) {
  if (!status) return false;
  const s = String(status).trim().toUpperCase();
  if (s === "WAITING_FOR_ACCEPTANCE" || s === "NEW" || s === "PENDING" ||
    s === "DECLINED" || s === "REJECTED" || s === "CANCELLED" || s === "DRAFT") {
    return false;
  }
  return true;
}

async function fetchProfessionalRequests() {
  const token = getCleanToken();
  isProfessionalRequestsLoading = true;
  professionalRequestsError = null;

  if (activeRoute === 'my-requests') {
    const container = document.getElementById('main-view');
    if (container) renderProfessionalMyRequests(container);
  }

  if (!token) {
    isProfessionalRequestsLoading = false;
    professionalRequestsError = "Authentication required. Please sign in to view your material requests.";
    if (activeRoute === 'my-requests') {
      const container = document.getElementById('main-view');
      if (container) renderProfessionalMyRequests(container);
    }
    return;
  }

  try {
    const baseUrl = getApiBaseUrl();
    let res = await fetch(`${baseUrl}/api/professional/my-requests`, {
      headers: {
        "Authorization": "Bearer " + token,
        "Accept": "application/json"
      }
    });
    if (!res.ok) {
      res = await fetch(`${baseUrl}/api/customer/my-requests`, {
        headers: {
          "Authorization": "Bearer " + token,
          "Accept": "application/json"
        }
      });
    }

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const rawRequests = Array.isArray(data) ? data : [];

    // For any MATERIAL_REQUIREMENT, fetch quotations
    await Promise.all(rawRequests.map(async (req) => {
      if (req.type === 'MATERIAL_REQUIREMENT') {
        const matId = req.backendId || req.id;
        try {
          let qRes = await fetch(`${baseUrl}/api/professional/requests/MATERIAL_REQUIREMENT/${matId}/quotations`, {
            headers: { "Authorization": "Bearer " + token, "Accept": "application/json" }
          });
          if (!qRes.ok) {
            qRes = await fetch(`${baseUrl}/api/customer/requests/MATERIAL_REQUIREMENT/${matId}/quotations`, {
              headers: { "Authorization": "Bearer " + token, "Accept": "application/json" }
            });
          }
          if (qRes.ok) {
            const quotes = await qRes.json();
            req.quotations = Array.isArray(quotes) ? quotes : [];
          } else {
            req.quotations = [];
          }
        } catch (e) {
          req.quotations = [];
        }
      } else {
        req.quotations = [];
      }
    }));

    professionalRequests = rawRequests;
    isProfessionalRequestsLoading = false;
    updateProfessionalMyRequestsBadge();

    // Trigger orders count update as well to keep them in sync
    await fetchProfessionalOrdersCount();

  } catch (err) {
    console.error("Failed to fetch professional requests:", err);
    isProfessionalRequestsLoading = false;
    professionalRequestsError = "Unable to load material requests from the server. Please check your connection.";
  }

  if (activeRoute === 'my-requests') {
    const container = document.getElementById('main-view');
    if (container) renderProfessionalMyRequests(container);
  }
}

async function fetchProfessionalOrders() {
  const token = getCleanToken();
  isProfessionalOrdersLoading = true;
  professionalOrdersError = null;

  if (activeRoute === 'my-orders') {
    const container = document.getElementById('main-view');
    if (container) renderProfessionalMyOrders(container);
  }

  if (!token) {
    isProfessionalOrdersLoading = false;
    professionalOrdersError = "Authentication required. Please sign in to view your material orders.";
    if (activeRoute === 'my-orders') {
      const container = document.getElementById('main-view');
      if (container) renderProfessionalMyOrders(container);
    }
    return;
  }

  try {
    const baseUrl = getApiBaseUrl();
    let res = await fetch(`${baseUrl}/api/material-orders/professional`, {
      headers: {
        "Authorization": "Bearer " + token,
        "Accept": "application/json"
      }
    });

    if (!res.ok) {
      res = await fetch(`${baseUrl}/api/material-orders/buyer`, {
        headers: {
          "Authorization": "Bearer " + token,
          "Accept": "application/json"
        }
      });
    }

    if (!res.ok) {
      res = await fetch(`${baseUrl}/api/material-orders/customer`, {
        headers: {
          "Authorization": "Bearer " + token,
          "Accept": "application/json"
        }
      });
    }

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const rawOrders = Array.isArray(data) ? data : [];

    // Filter out unaccepted/waiting orders
    professionalOrders = rawOrders.filter(o => isProfessionalAcceptedOrderStatus(o.orderStatus || o.status));
    isProfessionalOrdersLoading = false;
    updateProfessionalMyOrdersBadge();

  } catch (err) {
    console.error("Failed to fetch professional orders:", err);
    isProfessionalOrdersLoading = false;
    professionalOrdersError = "Unable to load material orders from the server. Please check your connection.";
  }

  if (activeRoute === 'my-orders') {
    const container = document.getElementById('main-view');
    if (container) renderProfessionalMyOrders(container);
  }
}

function handleProRequestSearch(val) {
  proRequestSearchQuery = (val || "").trim().toLowerCase();
  const container = document.getElementById('main-view');
  if (container && activeRoute === 'my-requests') {
    renderProfessionalMyRequests(container);
  }
}

function setProRequestTypeFilter(filter) {
  proRequestTypeFilter = filter;
  const container = document.getElementById('main-view');
  if (container && activeRoute === 'my-requests') {
    renderProfessionalMyRequests(container);
  }
}

function setProRequestStatusFilter(filter) {
  proRequestStatusFilter = filter;
  const container = document.getElementById('main-view');
  if (container && activeRoute === 'my-requests') {
    renderProfessionalMyRequests(container);
  }
}

/**
 * Professional-specific material request status resolver.
 * Precedence for material requests:
 * 1. Explicit request-level rejection -> "Rejected" (card opacity 0.6)
 * 2. Explicit request-level cancellation -> "Cancelled" (not faded)
 * 3. A confirmed accepted order linked to that exact request -> "Order Accepted" (even if stored request status is stale NEW/WAITING_FOR_ACCEPTANCE)
 * 4. Explicit accepted/allocation status on the request itself -> "Order Accepted"
 * 5. Otherwise -> "Waiting for Acceptance"
 *
 * Fulfillment stages (Processing, Dispatched, Out for Delivery, Delivered) are NOT displayed as separate My Request statuses.
 * Parent request is NEVER rejected merely because an individual quotation was rejected.
 * Direct Hire service requests are preserved without material-order logic.
 */
function resolveProfessionalRequestStatus(req) {
  if (!req) {
    return {
      status: "Waiting for Acceptance",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      iconClass: "fa-hourglass-half",
      isWaiting: true,
      isAccepted: false,
      isDeclined: false,
      isRejected: false,
      isCancelled: false
    };
  }

  // Preserve non-material requests (e.g., DIRECT_HIRE service requests)
  if (req.type === "DIRECT_HIRE") {
    const raw = String(req.rawStatus || req.status || "PENDING").trim().toUpperCase();
    const display = req.status || req.rawStatus || "Active";
    let badge = "bg-amber-50 text-amber-700 border-amber-200";
    let icon = "fa-hourglass-half";
    if (raw.includes("DECLINED") || raw.includes("REJECTED")) {
      badge = "bg-rose-50 text-rose-700 border-rose-200";
      icon = "fa-ban";
    } else if (raw.includes("ACCEPTED") || raw.includes("CONFIRMED")) {
      badge = "bg-emerald-50 text-emerald-700 border-emerald-200";
      icon = "fa-check";
    }
    return {
      status: display,
      badgeClass: badge,
      iconClass: icon,
      isWaiting: raw.includes("PENDING") || raw.includes("WAITING"),
      isAccepted: raw.includes("ACCEPTED") || raw.includes("CONFIRMED"),
      isDeclined: raw.includes("DECLINED") || raw.includes("REJECTED"),
      isRejected: raw.includes("DECLINED") || raw.includes("REJECTED"),
      isCancelled: raw.includes("CANCEL")
    };
  }

  const rawNorm = String(req.rawStatus || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  const displayNorm = String(req.status || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  const sellerStatusNorm = String(req.sellerStatus || req.sellerAction || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  // 1. Explicit request-level rejection
  // CRITICAL: Do NOT infer parent-request rejection from an individual quotation's rejected status.
  const isExplicitlyRejected =
    rawNorm === "DECLINED" || rawNorm === "REJECTED" ||
    displayNorm === "DECLINED" || displayNorm === "REJECTED" ||
    sellerStatusNorm === "DECLINED" || sellerStatusNorm === "REJECTED" ||
    req.rejected === true || req.declined === true;

  if (isExplicitlyRejected) {
    return {
      status: "Rejected",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      iconClass: "fa-ban",
      isWaiting: false,
      isAccepted: false,
      isDeclined: true,
      isRejected: true,
      isCancelled: false
    };
  }

  // 2. Explicit request-level cancellation (distinct from rejection; not faded)
  if (rawNorm === "CANCELLED" || rawNorm === "CANCELED" || displayNorm === "CANCELLED" || displayNorm === "CANCELED" || req.cancelled === true) {
    return {
      status: "Cancelled",
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
      iconClass: "fa-ban",
      isWaiting: false,
      isAccepted: false,
      isDeclined: false,
      isRejected: false,
      isCancelled: true
    };
  }

  // 3. Check for a confirmed accepted order linked to that exact request
  // Even when request entity still has a stale NEW or WAITING_FOR_ACCEPTANCE status.
  const ACCEPTED_ORDER_STATUSES = [
    "ORDER_ACCEPTED",
    "ACCEPTED",
    "CONFIRMED",
    "ALLOCATED",
    "PURCHASE_PLAN_CONFIRMED",
    "PROCESSING",
    "READY_FOR_DISPATCH",
    "DISPATCHED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "COMPLETED",
    "CLOSED"
  ];

  function isAcceptedOrderRecord(order) {
    if (!order) return false;
    const os = String(order.status || order.orderStatus || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
    if (!os || ["WAITING_FOR_ACCEPTANCE", "NEW", "PENDING", "DECLINED", "REJECTED", "CANCELLED", "CANCELED", "DRAFT"].includes(os)) {
      return false;
    }
    return ACCEPTED_ORDER_STATUSES.includes(os);
  }

  // Check req.orders or req.sellerOrders
  const linkedOrders = Array.isArray(req.orders) && req.orders.length > 0 ? req.orders :
    (Array.isArray(req.sellerOrders) && req.sellerOrders.length > 0 ? req.sellerOrders : []);
  const hasAcceptedAttachedOrder = linkedOrders.some(isAcceptedOrderRecord);

  // Check professionalOrders collection for this authenticated Professional
  const reqDbId = req.backendId != null ? String(req.backendId).trim() : null;
  const reqCardId = req.id != null ? String(req.id).trim() : null;
  const reqNumFromId = reqCardId ? reqCardId.replace(/^[A-Za-z-]+/, '').trim() : null;

  let hasAcceptedGlobalOrder = false;
  if (Array.isArray(professionalOrders) && professionalOrders.length > 0) {
    hasAcceptedGlobalOrder = professionalOrders.some(order => {
      if (!isAcceptedOrderRecord(order)) return false;
      const orderMrId = order.materialRequestId != null ? String(order.materialRequestId).trim() :
        (order.materialRequest && order.materialRequest.id != null ? String(order.materialRequest.id).trim() : null);
      const orderReqCode = order.materialRequest && order.materialRequest.requestId ? String(order.materialRequest.requestId).trim() : null;

      const idMatch = (reqDbId && orderMrId === reqDbId) ||
        (reqNumFromId && orderMrId === reqNumFromId) ||
        (reqCardId && orderReqCode === reqCardId);
      return Boolean(idMatch);
    });
  }

  if (hasAcceptedAttachedOrder || hasAcceptedGlobalOrder) {
    return {
      status: "Order Accepted",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      iconClass: "fa-check",
      isWaiting: false,
      isAccepted: true,
      isDeclined: false,
      isRejected: false,
      isCancelled: false
    };
  }

  // 4. Explicit accepted/allocation status on the request itself
  const isRequestEntityAccepted =
    ACCEPTED_ORDER_STATUSES.includes(rawNorm) ||
    ACCEPTED_ORDER_STATUSES.includes(displayNorm) ||
    sellerStatusNorm === "ACCEPTED" || sellerStatusNorm === "ORDER_ACCEPTED";

  if (isRequestEntityAccepted) {
    return {
      status: "Order Accepted",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      iconClass: "fa-check",
      isWaiting: false,
      isAccepted: true,
      isDeclined: false,
      isRejected: false,
      isCancelled: false
    };
  }

  // 5. Otherwise -> Waiting for Acceptance
  return {
    status: "Waiting for Acceptance",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    iconClass: "fa-hourglass-half",
    isWaiting: true,
    isAccepted: false,
    isDeclined: false,
    isRejected: false,
    isCancelled: false
  };
}

function getProSupplierDeclinedAlertHTML(req) {
  const rawStatus = (req.rawStatus || req.status || "").toUpperCase();
  const sellerStatus = (req.sellerStatus || req.sellerAction || "").toUpperCase();
  const isDeclined = rawStatus.includes("DECLINED") || rawStatus.includes("REJECTED") ||
    sellerStatus.includes("DECLINED") || sellerStatus.includes("REJECTED") ||
    req.rejected === true || req.declined === true;

  if (!isDeclined) return '';

  return `
    <div class="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
      <div class="flex items-start gap-3">
        <div class="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 text-sm">
          <i class="fa-solid fa-circle-xmark"></i>
        </div>
        <div>
          <div class="font-bold text-xs text-rose-900">Request Declined by Supplier / विक्रेता द्वारा अस्वीकृत</div>
          <p class="text-[11px] text-rose-700 mt-0.5">Supplier (${escapeHtml(req.sellerName || req.targetSeller || 'Designated Supplier')}) was unable to fulfill this request. No payments were deducted. You can place a direct buy request with another verified seller or post a material requirement.</p>
          <div class="mt-3">
            <a href="buy-material-select.html" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition">
              <i class="fa-solid fa-cart-shopping"></i> Explore Other Suppliers
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function getProDirectBuyTimelineHTML(req) {
  // Fulfillment timeline has been removed from My Requests per specifications.
  // Returns supplier declined alert when rejected, otherwise empty string.
  return getProSupplierDeclinedAlertHTML(req);
}

function renderProfessionalMyRequests(container) {
  const allReqs = Array.isArray(professionalRequests) ? professionalRequests : [];

  // Filter by Type
  let filtered = allReqs;
  if (proRequestTypeFilter === "DIRECT_BUY") {
    filtered = filtered.filter(r => r.type === "DIRECT_BUY" || r.isDirectBuy);
  } else if (proRequestTypeFilter === "MATERIAL_REQUIREMENT") {
    filtered = filtered.filter(r => r.type === "MATERIAL_REQUIREMENT" || !r.isDirectBuy);
  }

  // Filter by Status
  if (proRequestStatusFilter !== "ALL") {
    filtered = filtered.filter(r => {
      const resolved = resolveProfessionalRequestStatus(r);
      if (proRequestStatusFilter === "WAITING_FOR_ACCEPTANCE") {
        return resolved.status === "Waiting for Acceptance";
      }
      if (proRequestStatusFilter === "ACCEPTED") {
        return resolved.status === "Order Accepted";
      }
      if (proRequestStatusFilter === "DECLINED" || proRequestStatusFilter === "REJECTED") {
        return resolved.status === "Rejected" || resolved.isRejected || resolved.isDeclined;
      }
      if (proRequestStatusFilter === "CANCELLED") {
        return resolved.status === "Cancelled" || resolved.isCancelled;
      }
      if (proRequestStatusFilter === "IN_PROGRESS" || proRequestStatusFilter === "DELIVERED") {
        return resolved.status === "Order Accepted";
      }
      return true;
    });
  }

  // Filter by Search Query
  if (proRequestSearchQuery) {
    const q = proRequestSearchQuery;
    filtered = filtered.filter(r => {
      const idMatch = (r.id || "").toLowerCase().includes(q);
      const titleMatch = (r.materialName || r.title || "").toLowerCase().includes(q);
      const sellerMatch = (r.sellerName || r.targetSeller || "").toLowerCase().includes(q);
      const locMatch = (r.location || r.deliverySite || "").toLowerCase().includes(q);
      return idMatch || titleMatch || sellerMatch || locMatch;
    });
  }

  const totalCount = allReqs.length;
  const directBuyCount = allReqs.filter(r => r.type === "DIRECT_BUY" || r.isDirectBuy).length;
  const waitingCount = allReqs.filter(r => resolveProfessionalRequestStatus(r).status === "Waiting for Acceptance").length;
  const acceptedCount = allReqs.filter(r => resolveProfessionalRequestStatus(r).status === "Order Accepted").length;

  container.innerHTML = `
    <div class="space-y-6 max-w-[1700px] mx-auto animate-fade-in">
      <!-- Header Row -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-orange-600"></span>
            <h2 class="text-xl font-extrabold text-slate-900 tracking-tight">My Requests / मेरे सामग्री अनुरोध</h2>
          </div>
          <p class="text-xs text-slate-500 mt-1">Track your submitted material purchase requests and quotation requirements in real-time.</p>
        </div>
        <div class="flex items-center gap-2.5 flex-wrap">
          <button onclick="fetchProfessionalRequests()" class="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition flex items-center gap-1.5">
            <i class="fa-solid fa-arrows-rotate text-slate-400"></i>
            <span>Refresh / ताज़ा करें</span>
          </button>
          <a href="buy-material-select.html" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5">
            <i class="fa-solid fa-cart-shopping"></i>
            <span>Buy Material / सामग्री खरीदें</span>
          </a>
        </div>
      </div>

      <!-- Metric Stat Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="pro-stat-card bg-white p-4 rounded-2xl border border-slate-200/90 shadow-subtle flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Requests</span>
            <h3 class="text-2xl font-extrabold text-slate-900 mt-0.5">${totalCount}</h3>
            <p class="text-[10px] text-slate-500 mt-0.5">All procurement entries</p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-base">
            <i class="fa-solid fa-file-circle-check"></i>
          </div>
        </div>

        <div class="pro-stat-card bg-white p-4 rounded-2xl border border-slate-200/90 shadow-subtle flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-sky-600">Direct Purchases</span>
            <h3 class="text-2xl font-extrabold text-slate-900 mt-0.5">${directBuyCount}</h3>
            <p class="text-[10px] text-slate-500 mt-0.5">Instant seller orders</p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center text-base">
            <i class="fa-solid fa-bolt"></i>
          </div>
        </div>

        <div class="pro-stat-card bg-white p-4 rounded-2xl border border-slate-200/90 shadow-subtle flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-amber-600">Waiting Acceptance</span>
            <h3 class="text-2xl font-extrabold text-slate-900 mt-0.5">${waitingCount}</h3>
            <p class="text-[10px] text-slate-500 mt-0.5">Pending seller review</p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-base">
            <i class="fa-solid fa-hourglass-half"></i>
          </div>
        </div>

        <div class="pro-stat-card bg-white p-4 rounded-2xl border border-slate-200/90 shadow-subtle flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Order Accepted</span>
            <h3 class="text-2xl font-extrabold text-slate-900 mt-0.5">${acceptedCount}</h3>
            <p class="text-[10px] text-slate-500 mt-0.5">Ready in My Orders</p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-base">
            <i class="fa-solid fa-truck-ramp-box"></i>
          </div>
        </div>
      </div>

      <!-- Filter & Search Toolbar -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
        <!-- Search Input -->
        <div class="relative flex-1 max-w-md">
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
          <input type="text" value="${escapeHtml(proRequestSearchQuery)}" oninput="handleProRequestSearch(this.value)" placeholder="Search by request ID, material, supplier..." class="w-full text-xs pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 transition">
          ${proRequestSearchQuery ? `
            <button onclick="handleProRequestSearch('')" class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs">&times;</button>
          ` : ''}
        </div>

        <!-- Filter Selectors -->
        <div class="flex items-center gap-2.5 flex-wrap">
          <!-- Type Filter -->
          <select onchange="setProRequestTypeFilter(this.value)" class="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500">
            <option value="ALL" ${proRequestTypeFilter === 'ALL' ? 'selected' : ''}>All Request Types / सभी प्रकार</option>
            <option value="DIRECT_BUY" ${proRequestTypeFilter === 'DIRECT_BUY' ? 'selected' : ''}>Direct Purchase / सीधा खरीद</option>
            <option value="MATERIAL_REQUIREMENT" ${proRequestTypeFilter === 'MATERIAL_REQUIREMENT' ? 'selected' : ''}>Material Requirement / सामग्री आवश्यकता</option>
          </select>

          <!-- Status Filter -->
          <select onchange="setProRequestStatusFilter(this.value)" class="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500">
            <option value="ALL" ${proRequestStatusFilter === 'ALL' ? 'selected' : ''}>All Statuses / सभी स्थितियां</option>
            <option value="WAITING_FOR_ACCEPTANCE" ${proRequestStatusFilter === 'WAITING_FOR_ACCEPTANCE' ? 'selected' : ''}>Waiting for Acceptance</option>
            <option value="ACCEPTED" ${proRequestStatusFilter === 'ACCEPTED' ? 'selected' : ''}>Order Accepted</option>
            <option value="DECLINED" ${proRequestStatusFilter === 'DECLINED' || proRequestStatusFilter === 'REJECTED' ? 'selected' : ''}>Rejected</option>
            <option value="CANCELLED" ${proRequestStatusFilter === 'CANCELLED' ? 'selected' : ''}>Cancelled</option>
          </select>
        </div>
      </div>

      <!-- Content State Display -->
      ${isProfessionalRequestsLoading ? `
        <div class="p-12 text-center bg-white rounded-2xl border border-slate-200/90 shadow-subtle space-y-3">
          <div class="inline-block animate-spin w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full mb-2"></div>
          <h4 class="text-sm font-bold text-slate-800">Loading your material requests...</h4>
          <p class="text-xs text-slate-500">Connecting to BuildBid procurement engine...</p>
        </div>
      ` : professionalRequestsError ? `
        <div class="p-10 text-center bg-white rounded-2xl border border-rose-200 shadow-subtle space-y-3">
          <div class="w-12 h-12 mx-auto rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-xl">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>
          <h4 class="text-sm font-bold text-slate-800">${escapeHtml(professionalRequestsError)}</h4>
          <button onclick="fetchProfessionalRequests()" class="mt-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold shadow-sm transition">
            <i class="fa-solid fa-rotate-right mr-1"></i> Retry
          </button>
        </div>
      ` : filtered.length === 0 ? `
        <div class="p-16 text-center bg-white rounded-2xl border border-slate-200/90 shadow-subtle space-y-4">
          <div class="w-16 h-16 mx-auto rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center text-2xl">
            <i class="fa-solid fa-file-circle-check"></i>
          </div>
          <div>
            <h3 class="text-base font-extrabold text-slate-900">No material requests found</h3>
            <p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              ${proRequestSearchQuery || proRequestStatusFilter !== 'ALL' || proRequestTypeFilter !== 'ALL'
        ? 'No requests match your current search or filter criteria. Try resetting filters.'
        : 'You have not submitted any material purchase requests yet. You can purchase material directly from nearby verified suppliers or post a requirement.'}
            </p>
          </div>
          <div class="pt-2">
            <a href="buy-material-select.html" class="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-sm transition">
              <i class="fa-solid fa-cart-shopping"></i>
              <span>Buy Material / सामग्री खरीदें</span>
            </a>
          </div>
        </div>
      ` : `
        <div class="space-y-4">
          ${filtered.map(req => {
          const isDirectBuy = req.type === "DIRECT_BUY" || req.isDirectBuy;
          const reqId = req.id || (isDirectBuy ? `DMR-${req.backendId}` : `MR-${req.backendId}`);
          const dateStr = req.submittedDate || "Recently";

          // Status normalization for Professional My Requests
          const resolvedStatus = resolveProfessionalRequestStatus(req);
          const statusBadge = resolvedStatus.badgeClass;
          const statusIcon = resolvedStatus.iconClass;
          const isRejectedCard = resolvedStatus.status === "Rejected" || resolvedStatus.isRejected === true;

          const sellerName = req.sellerName || req.targetSeller || "Designated Supplier";
          const sellerLoc = req.sellerAddress || req.location || "Regional Supplier";
          const sellerPhone = req.sellerPhone || "";

          return `
              <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-6 hover:shadow-card transition${isRejectedCard ? ' opacity-60' : ''}"${isRejectedCard ? ' style="opacity: 0.6;"' : ''}>
                <!-- Card Header -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div class="flex items-center gap-3 flex-wrap">
                    <span class="text-sm font-extrabold text-slate-900 font-mono">${escapeHtml(reqId)}</span>
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isDirectBuy ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}">
                      ${isDirectBuy ? '<i class="fa-solid fa-bolt mr-1"></i> Direct Purchase' : '<i class="fa-solid fa-list-check mr-1"></i> Material Requirement'}
                    </span>
                    <span class="text-[11px] text-slate-400 flex items-center gap-1">
                      <i class="fa-regular fa-clock"></i> ${escapeHtml(dateStr)}
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="px-3 py-1 rounded-full text-xs font-bold border ${statusBadge} inline-flex items-center gap-1.5">
                      <i class="fa-solid ${statusIcon} text-[10px]"></i>
                      <span>${escapeHtml(resolvedStatus.status)}</span>
                    </span>
                  </div>
                </div>

                <!-- Materials & Details Grid -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
                  <!-- Item Info -->
                  <div class="space-y-1">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Material & Volume</span>
                    <div class="font-extrabold text-slate-900 text-sm">
                      ${escapeHtml(req.materialName || (req.items && req.items.length ? req.items.map(i => i.materialName).join(", ") : "Construction Material"))}
                    </div>
                    <div class="text-slate-600">
                      ${escapeHtml(req.quantity || (req.items && req.items.length ? req.items.map(i => `${i.quantity} ${i.unit || ''}`).join(", ") : "Quantity specified"))}
                    </div>
                    ${req.estimatedTotal ? `
                      <div class="text-emerald-700 font-bold text-xs mt-1">
                        Est. Total: ₹${Number(req.estimatedTotal).toLocaleString("en-IN")}
                      </div>
                    ` : ''}
                  </div>

                  <!-- Supplier Info -->
                  <div class="space-y-1">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Designated Supplier</span>
                    <div class="font-bold text-slate-900">${escapeHtml(sellerName)}</div>
                    <div class="text-slate-500 text-[11px]"><i class="fa-solid fa-location-dot text-slate-400 mr-1"></i>${escapeHtml(sellerLoc)}</div>
                    ${sellerPhone ? `
                      <div class="text-[11px] text-slate-600 mt-0.5">
                        <a href="tel:${escapeHtml(sellerPhone)}" class="text-orange-600 hover:underline inline-flex items-center gap-1 font-semibold">
                          <i class="fa-solid fa-phone text-[10px]"></i> ${escapeHtml(sellerPhone)}
                        </a>
                      </div>
                    ` : ''}
                  </div>

                  <!-- Delivery & Verification -->
                  <div class="space-y-1">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivery Site</span>
                    <div class="text-slate-800 font-medium">${escapeHtml(req.deliverySite || req.location || "Project Site")}</div>
                    ${req.verificationCode ? `
                      <div class="pt-1">
                        <span class="text-[10px] text-slate-500 font-medium">Verification Code:</span>
                        <span class="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 ml-1">${escapeHtml(req.verificationCode)}</span>
                      </div>
                    ` : ''}
                  </div>
                </div>

                <!-- Supplier declined notice preserved; fulfillment timeline removed from My Requests -->
                ${isDirectBuy && isRejectedCard ? getProSupplierDeclinedAlertHTML(req) : ''}

                <!-- Material Requirement Quotations List -->
                ${!isDirectBuy && req.quotations && req.quotations.length ? `
                  <div class="mt-4 pt-4 border-t border-slate-100">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Quotations Received (${req.quotations.length})</span>
                    </div>
                    <div class="space-y-2">
                      ${req.quotations.map(q => {
            const qStatus = (q.status || "PENDING").toUpperCase();
            const isQAccepted = qStatus === "ACCEPTED";
            const isQRejected = qStatus === "REJECTED";
            return `
                          <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
                            <div>
                              <div class="font-bold text-slate-900">${escapeHtml(q.sellerName || q.providerName || "Verified Supplier")}</div>
                              <div class="text-[11px] text-slate-500">Quoted: <strong class="text-slate-800">₹${Number(q.quotedAmount || q.totalAmount || 0).toLocaleString("en-IN")}</strong> • Delivery in ${escapeHtml(q.deliveryDays || "3-5")} Days</div>
                              ${q.notes ? `<div class="text-[10px] text-slate-400 mt-0.5">"${escapeHtml(q.notes)}"</div>` : ''}
                            </div>
                            <div class="flex items-center gap-2">
                              ${isQAccepted ? `
                                <span class="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs">
                                  <i class="fa-solid fa-check"></i> Accepted Quotation
                                </span>
                              ` : isQRejected ? `
                                <span class="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold rounded-lg text-xs">
                                  <i class="fa-solid fa-xmark"></i> Rejected
                                </span>
                              ` : `
                                <button onclick="handleAcceptProQuotation('${q.backendId || q.id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-2xs transition">
                                  Accept Quote
                                </button>
                                <button onclick="handleRejectProQuotation('${q.backendId || q.id}')" class="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg font-semibold text-xs transition">
                                  Decline
                                </button>
                              `}
                            </div>
                          </div>
                        `;
          }).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>
            `;
        }).join('')}
        </div>
      `}
    </div>
  `;
}

function handleProOrderSearch(val) {
  proOrderSearchQuery = (val || "").trim().toLowerCase();
  const container = document.getElementById('main-view');
  if (container && activeRoute === 'my-orders') {
    renderProfessionalMyOrders(container);
  }
}

function setProOrderStatusFilter(filter) {
  proOrderStatusFilter = filter;
  const container = document.getElementById('main-view');
  if (container && activeRoute === 'my-orders') {
    renderProfessionalMyOrders(container);
  }
}

function extractProOrderStatus(item) {
  if (!item) return "CONFIRMED";
  const candidates = [item.deliveryStatus, item.orderStatus, item.rawStatus, item.status];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) {
      return c.trim().toUpperCase();
    }
  }
  return "CONFIRMED";
}

function getProOrderStageIndex(status) {
  const s = (typeof status === "string" ? status.trim() : "").toUpperCase();
  if (s.includes("DELIVERED") || s.includes("COMPLETED")) return 4;
  if (s.includes("OUT_FOR_DELIVERY")) return 3;
  if (s.includes("IN_TRANSIT") || s.includes("TRANSIT") || s.includes("DISPATCH") || s.includes("READY_TO_DISPATCH") || s.includes("READY_FOR_DISPATCH") || s.includes("DELAYED") || s.includes("RETURNED")) return 2;
  return 1; // PROCESSING / ACCEPTED
}

function getProOrderProgressBarHTML(status) {
  const stage = getProOrderStageIndex(status);
  const s = (status || "").toUpperCase();

  let stage2Label = "Dispatched";
  let stage2Sub = "भेजा गया";
  if (stage === 2) {
    if (s.includes("IN_TRANSIT") || s.includes("TRANSIT")) {
      stage2Label = "In Transit";
      stage2Sub = "रास्ते में";
    } else if (s.includes("READY")) {
      stage2Label = "Ready for Dispatch";
      stage2Sub = "तैयार";
    } else if (s.includes("DELAYED")) {
      stage2Label = "Delayed";
      stage2Sub = "विलंबित";
    }
  }

  const stages = [
    { num: 1, label: "Processing", sub: "प्रक्रिया में", icon: "fa-solid fa-gear" },
    { num: 2, label: stage2Label, sub: stage2Sub, icon: s.includes("IN_TRANSIT") ? "fa-solid fa-truck-moving" : "fa-solid fa-box-open" },
    { num: 3, label: "Out for Delivery", sub: "रवाना", icon: "fa-solid fa-truck-fast" },
    { num: 4, label: "Delivered", sub: "डिलीवर", icon: "fa-solid fa-circle-check" }
  ];

  return `
    <div class="py-3 px-4 bg-slate-50/80 rounded-xl border border-slate-100 my-4">
      <div class="grid grid-cols-4 gap-2 text-center relative">
        ${stages.map((st) => {
    const isDone = stage >= st.num;
    const isCurrent = stage === st.num;
    const iconBg = isDone ? (st.num === 4 ? 'bg-teal-500 text-white' : 'bg-emerald-500 text-white') : 'bg-white text-slate-400 border border-slate-200';
    const ring = isCurrent ? 'ring-4 ring-emerald-500/20' : '';
    return `
            <div class="flex flex-col items-center">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${iconBg} ${ring} shadow-2xs mb-1.5 transition">
                <i class="${st.icon}"></i>
              </div>
              <span class="text-xs font-bold ${isDone ? 'text-slate-800' : 'text-slate-400'}">${st.label}</span>
              <span class="text-[10px] text-slate-400">${st.sub}</span>
            </div>
          `;
  }).join('')}
      </div>
    </div>
  `;
}

function renderProfessionalMyOrders(container) {
  const allOrders = Array.isArray(professionalOrders) ? professionalOrders : [];

  // Filter by Status
  let filtered = allOrders;
  if (proOrderStatusFilter !== "ALL") {
    filtered = filtered.filter(o => {
      const stage = getProOrderStageIndex(extractProOrderStatus(o));
      if (proOrderStatusFilter === "PROCESSING") return stage === 1;
      if (proOrderStatusFilter === "DISPATCHED") return stage === 2;
      if (proOrderStatusFilter === "OUT_FOR_DELIVERY") return stage === 3;
      if (proOrderStatusFilter === "DELIVERED") return stage === 4;
      return true;
    });
  }

  // Filter by Search Query
  if (proOrderSearchQuery) {
    const q = proOrderSearchQuery;
    filtered = filtered.filter(o => {
      const codeMatch = (o.orderCode || o.orderId || "").toLowerCase().includes(q);
      const titleMatch = (o.materialTitle || (o.items && o.items.map(i => i.materialName).join(" ")) || "").toLowerCase().includes(q);
      const sellerMatch = (o.sellerName || o.sellerBusinessName || "").toLowerCase().includes(q);
      const siteMatch = (o.deliverySite || o.deliveryAddress || "").toLowerCase().includes(q);
      return codeMatch || titleMatch || sellerMatch || siteMatch;
    });
  }

  const totalOrders = allOrders.length;
  const processingCount = allOrders.filter(o => getProOrderStageIndex(extractProOrderStatus(o)) === 1).length;
  const inTransitCount = allOrders.filter(o => [2, 3].includes(getProOrderStageIndex(extractProOrderStatus(o)))).length;
  const deliveredCount = allOrders.filter(o => getProOrderStageIndex(extractProOrderStatus(o)) === 4).length;

  container.innerHTML = `
    <div class="space-y-6 max-w-[1700px] mx-auto animate-fade-in">
      <!-- Header Row -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <h2 class="text-xl font-extrabold text-slate-900 tracking-tight">My Orders / मेरे सामग्री ऑर्डर</h2>
          </div>
          <p class="text-xs text-slate-500 mt-1">Track delivery, seller fulfillment, and dispatch milestones for your accepted material orders.</p>
        </div>
        <div class="flex items-center gap-2.5 flex-wrap">
          <button onclick="fetchProfessionalOrders()" class="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition flex items-center gap-1.5">
            <i class="fa-solid fa-arrows-rotate text-slate-400"></i>
            <span>Refresh / ताज़ा करें</span>
          </button>
          <button onclick="navigate('my-requests')" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5">
            <i class="fa-solid fa-file-circle-check"></i>
            <span>View My Requests</span>
          </button>
        </div>
      </div>

      <!-- Direct Payment Model Notice -->
      <div class="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
        <i class="fa-solid fa-shield-halved text-amber-600 text-sm mt-0.5 flex-shrink-0"></i>
        <div class="leading-relaxed">
          <strong class="font-bold">Direct Buyer-to-Supplier Settlement:</strong>
          <span>BuildBid connects buyers directly with vetted material suppliers. Payment is settled directly between you and the designated seller upon material receipt and inspection. No platform deductions or third-party processing.</span>
        </div>
      </div>

      <!-- Metric Stat Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="pro-stat-card bg-white p-4 rounded-2xl border border-slate-200/90 shadow-subtle flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Confirmed Orders</span>
            <h3 class="text-2xl font-extrabold text-slate-900 mt-0.5">${totalOrders}</h3>
            <p class="text-[10px] text-slate-500 mt-0.5">Accepted orders lifecycle</p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-base">
            <i class="fa-solid fa-boxes-packing"></i>
          </div>
        </div>

        <div class="pro-stat-card bg-white p-4 rounded-2xl border border-slate-200/90 shadow-subtle flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-blue-600">Processing</span>
            <h3 class="text-2xl font-extrabold text-slate-900 mt-0.5">${processingCount}</h3>
            <p class="text-[10px] text-slate-500 mt-0.5">Being packaged by seller</p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-base">
            <i class="fa-solid fa-gear"></i>
          </div>
        </div>

        <div class="pro-stat-card bg-white p-4 rounded-2xl border border-slate-200/90 shadow-subtle flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-indigo-600">In Transit</span>
            <h3 class="text-2xl font-extrabold text-slate-900 mt-0.5">${inTransitCount}</h3>
            <p class="text-[10px] text-slate-500 mt-0.5">Dispatched / on route</p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-base">
            <i class="fa-solid fa-truck-fast"></i>
          </div>
        </div>

        <div class="pro-stat-card bg-white p-4 rounded-2xl border border-slate-200/90 shadow-subtle flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Delivered</span>
            <h3 class="text-2xl font-extrabold text-slate-900 mt-0.5">${deliveredCount}</h3>
            <p class="text-[10px] text-slate-500 mt-0.5">Completed site arrivals</p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-base">
            <i class="fa-solid fa-circle-check"></i>
          </div>
        </div>
      </div>

      <!-- Filter & Search Toolbar -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
        <!-- Search Input -->
        <div class="relative flex-1 max-w-md">
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
          <input type="text" value="${escapeHtml(proOrderSearchQuery)}" oninput="handleProOrderSearch(this.value)" placeholder="Search by order code, material, supplier, site..." class="w-full text-xs pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition">
          ${proOrderSearchQuery ? `
            <button onclick="handleProOrderSearch('')" class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs">&times;</button>
          ` : ''}
        </div>

        <!-- Filter Selectors -->
        <div class="flex items-center gap-2.5 flex-wrap">
          <select onchange="setProOrderStatusFilter(this.value)" class="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500">
            <option value="ALL" ${proOrderStatusFilter === 'ALL' ? 'selected' : ''}>All Order Stages / सभी चरण</option>
            <option value="PROCESSING" ${proOrderStatusFilter === 'PROCESSING' ? 'selected' : ''}>Stage 1: Processing / प्रक्रिया में</option>
            <option value="DISPATCHED" ${proOrderStatusFilter === 'DISPATCHED' ? 'selected' : ''}>Stage 2: Dispatched / भेजा गया</option>
            <option value="OUT_FOR_DELIVERY" ${proOrderStatusFilter === 'OUT_FOR_DELIVERY' ? 'selected' : ''}>Stage 3: Out for Delivery / रवाना</option>
            <option value="DELIVERED" ${proOrderStatusFilter === 'DELIVERED' ? 'selected' : ''}>Stage 4: Delivered / डिलीवर हो गया</option>
          </select>
        </div>
      </div>

      <!-- Content Display -->
      ${isProfessionalOrdersLoading ? `
        <div class="p-12 text-center bg-white rounded-2xl border border-slate-200/90 shadow-subtle space-y-3">
          <div class="inline-block animate-spin w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full mb-2"></div>
          <h4 class="text-sm font-bold text-slate-800">Loading your material orders...</h4>
          <p class="text-xs text-slate-500">Retrieving confirmed fulfillment records...</p>
        </div>
      ` : professionalOrdersError ? `
        <div class="p-10 text-center bg-white rounded-2xl border border-rose-200 shadow-subtle space-y-3">
          <div class="w-12 h-12 mx-auto rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-xl">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>
          <h4 class="text-sm font-bold text-slate-800">${escapeHtml(professionalOrdersError)}</h4>
          <button onclick="fetchProfessionalOrders()" class="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition">
            <i class="fa-solid fa-rotate-right mr-1"></i> Retry
          </button>
        </div>
      ` : filtered.length === 0 ? `
        <div class="p-16 text-center bg-white rounded-2xl border border-slate-200/90 shadow-subtle space-y-4">
          <div class="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl">
            <i class="fa-solid fa-truck-ramp-box"></i>
          </div>
          <div>
            <h3 class="text-base font-extrabold text-slate-900">No confirmed material orders yet</h3>
            <p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              ${proOrderSearchQuery || proOrderStatusFilter !== 'ALL'
        ? 'No orders match your filter criteria. Try resetting filters.'
        : 'When a supplier accepts your direct purchase request or confirms a quotation, your order will automatically appear here with live tracking.'}
            </p>
          </div>
          <div class="pt-2 flex items-center justify-center gap-3">
            <button onclick="navigate('my-requests')" class="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition shadow-2xs">
              Check My Requests
            </button>
            <a href="buy-material-select.html" class="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-sm transition">
              <i class="fa-solid fa-cart-shopping"></i>
              <span>Buy Material</span>
            </a>
          </div>
        </div>
      ` : `
        <div class="space-y-4">
          ${filtered.map(order => {
          const orderCode = order.orderCode || order.orderId || `ORD-${order.id}`;
          const rawStatus = extractProOrderStatus(order);
          const stage = getProOrderStageIndex(rawStatus);

          let statusBadge = 'bg-blue-50 text-blue-700 border-blue-200';
          let statusLabel = 'Processing / प्रक्रिया में';
          if (stage === 4) {
            statusBadge = 'bg-teal-50 text-teal-700 border-teal-200';
            statusLabel = 'Delivered / डिलीवर हो गया';
          } else if (stage === 3) {
            if (rawStatus.includes("FAILED")) {
              statusBadge = 'bg-rose-50 text-rose-700 border-rose-200';
              statusLabel = 'Delivery Failed / असफल';
            } else {
              statusBadge = 'bg-indigo-50 text-indigo-700 border-indigo-200';
              statusLabel = 'Out for Delivery / रवाना';
            }
          } else if (stage === 2) {
            if (rawStatus.includes("IN_TRANSIT") || rawStatus.includes("TRANSIT")) {
              statusBadge = 'bg-sky-50 text-sky-700 border-sky-200';
              statusLabel = 'In Transit / रास्ते में';
            } else if (rawStatus.includes("READY")) {
              statusBadge = 'bg-amber-50 text-amber-700 border-amber-200';
              statusLabel = 'Ready for Dispatch / भेजने के लिए तैयार';
            } else if (rawStatus.includes("DELAYED")) {
              statusBadge = 'bg-rose-50 text-rose-700 border-rose-200';
              statusLabel = 'Delayed / विलंबित';
            } else if (rawStatus.includes("RETURNED")) {
              statusBadge = 'bg-slate-50 text-slate-700 border-slate-200';
              statusLabel = 'Returned / वापस लौटाया';
            } else {
              statusBadge = 'bg-sky-50 text-sky-700 border-sky-200';
              statusLabel = 'Dispatched / भेजा गया';
            }
          }

          const sellerName = order.sellerName || order.sellerBusinessName || "Verified Supplier";
          const sellerPhone = order.sellerPhone || "";
          const sellerLocation = order.sellerLocation || order.sellerAddress || "Regional Warehouse";
          const deliverySite = order.deliverySite || order.deliveryAddress || "Project Site";
          const orderedDate = order.orderedDate || (order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "Recently");

          return `
              <div class="bg-white rounded-2xl border border-slate-200/90 shadow-subtle p-6 hover:shadow-card transition">
                <!-- Order Header -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div class="flex items-center gap-3 flex-wrap">
                    <span class="text-sm font-extrabold text-slate-900 font-mono">${escapeHtml(orderCode)}</span>
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${order.type === 'DIRECT_BUY' || String(orderCode).startsWith('DMR-') ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}">
                      ${order.type === 'DIRECT_BUY' || String(orderCode).startsWith('DMR-') ? 'Direct Buy Order' : 'Multi-Seller Allocation'}
                    </span>
                    <span class="text-[11px] text-slate-400">
                      <i class="fa-regular fa-calendar mr-1"></i> Ordered: ${escapeHtml(orderedDate)}
                    </span>
                  </div>
                  <div>
                    <span class="px-3 py-1 rounded-full text-xs font-bold border ${statusBadge} inline-flex items-center gap-1.5">
                      <span class="w-1.5 h-1.5 rounded-full ${stage === 4 ? 'bg-teal-500' : 'bg-emerald-500 animate-pulse'}"></span>
                      <span>${escapeHtml(statusLabel)}</span>
                    </span>
                  </div>
                </div>

                <!-- 4-Stage Visual Progress Bar -->
                ${getProOrderProgressBarHTML(rawStatus)}

                <!-- Order Details Grid -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
                  <!-- Materials & Scope -->
                  <div class="space-y-1">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Materials Included</span>
                    <div class="font-extrabold text-slate-900 text-sm">
                      ${escapeHtml(order.materialTitle || (order.items && order.items.length ? order.items.map(i => i.materialName).join(", ") : "Construction Material Supplies"))}
                    </div>
                    ${order.items && order.items.length ? `
                      <div class="space-y-1 pt-1">
                        ${order.items.slice(0, 3).map(it => `
                          <div class="text-[11px] text-slate-600 flex justify-between pr-4">
                            <span>• ${escapeHtml(it.materialName)}</span>
                            <span class="font-semibold">${escapeHtml(it.quantity || '')} ${escapeHtml(it.unit || '')}</span>
                          </div>
                        `).join('')}
                        ${order.items.length > 3 ? `<span class="text-[10px] text-slate-400">+ ${order.items.length - 3} more items</span>` : ''}
                      </div>
                    ` : ''}
                  </div>

                  <!-- Supplier Information -->
                  <div class="space-y-1">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supplier Information</span>
                    <div class="font-bold text-slate-900">${escapeHtml(sellerName)}</div>
                    <div class="text-slate-500 text-[11px]"><i class="fa-solid fa-warehouse text-slate-400 mr-1"></i>${escapeHtml(sellerLocation)}</div>
                    ${sellerPhone ? `
                      <div class="pt-1">
                        <a href="tel:${escapeHtml(sellerPhone)}" class="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-xs font-semibold transition">
                          <i class="fa-solid fa-phone text-emerald-600 text-[10px]"></i> ${escapeHtml(sellerPhone)}
                        </a>
                      </div>
                    ` : ''}
                  </div>

                  <!-- Delivery & Verification -->
                  <div class="space-y-2">
                    <div>
                      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivery Site</span>
                      <div class="text-slate-800 font-medium">${escapeHtml(deliverySite)}</div>
                    </div>
                    <div class="flex items-center gap-2 text-xs">
                      <i class="fa-regular fa-calendar-check text-orange-600"></i>
                      <span class="text-slate-500">Expected Delivery:</span>
                      <span class="font-bold text-slate-800">${escapeHtml(order.expectedDeliveryDate || 'Pending confirmation from seller')}</span>
                    </div>
                  </div>
                </div>

                <!-- Verification Code & Financial Summary Row -->
                <div class="mt-4 pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    ${order.verificationCode ? `
                      <div class="inline-flex items-center gap-2 p-1.5 px-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                        <i class="fa-solid fa-shield-halved text-emerald-600 text-xs"></i>
                        <span class="text-slate-600 font-medium">Verification Code:</span>
                        <span class="font-mono font-bold text-emerald-800 tracking-wider">${escapeHtml(order.verificationCode)}</span>
                      </div>
                    ` : `
                      <span class="text-[11px] text-slate-400">Direct Purchase Fulfillment Order</span>
                    `}
                  </div>

                  <div class="flex items-center gap-3">
                    ${order.totalAmount ? `
                      <div class="text-right">
                        <span class="text-[10px] text-slate-400 uppercase font-semibold">Total Payable</span>
                        <div class="text-sm font-extrabold text-slate-900">₹${Number(order.totalAmount).toLocaleString("en-IN")}</div>
                      </div>
                    ` : ''}
                    <button onclick="openProfessionalOrderTrackingModal('${escapeHtml(orderCode)}')" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs">
                      <i class="fa-solid fa-truck-fast"></i> Track Delivery
                    </button>
                    <button onclick="navigate('my-requests')" class="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold border border-slate-200 transition">
                      View Request
                    </button>
                  </div>
                </div>
              </div>
            `;
        }).join('')}
        </div>
      `}
    </div>
  `;
}

function openProfessionalOrderTrackingModal(orderCode) {
  const order = professionalOrders.find(o => (o.orderCode || o.orderId || `ORD-${o.id}`) === orderCode);
  if (!order) return;

  const titleEl = document.getElementById('tracking-modal-title');
  if (titleEl) titleEl.innerText = `Fulfillment & Tracking: ${order.orderCode || order.orderId}`;

  const bodyEl = document.getElementById('tracking-modal-body');
  if (!bodyEl) return;

  const rawStatus = extractProOrderStatus(order);
  const stage = getProOrderStageIndex(rawStatus);

  bodyEl.innerHTML = `
    <div class="space-y-4">
      <!-- Progress Bar -->
      ${getProOrderProgressBarHTML(rawStatus)}

      <!-- Details Summary -->
      <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
        <div class="flex justify-between items-center">
          <span class="text-slate-500">Order Reference:</span>
          <span class="font-mono font-bold text-slate-900">${escapeHtml(order.orderCode || order.orderId)}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-slate-500">Current Status:</span>
          <span class="font-bold text-emerald-700">${escapeHtml(rawStatus)}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-slate-500">Expected Delivery Date:</span>
          <span class="font-bold text-slate-900">${escapeHtml(order.expectedDeliveryDate || 'Pending confirmation from supplier')}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-slate-500">Delivery Site:</span>
          <span class="font-medium text-slate-800">${escapeHtml(order.deliverySite || order.deliveryAddress || 'Site Location')}</span>
        </div>
        ${order.verificationCode ? `
          <div class="flex justify-between items-center pt-1 border-t border-slate-200">
            <span class="text-slate-500">Delivery Verification Code:</span>
            <span class="font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">${escapeHtml(order.verificationCode)}</span>
          </div>
        ` : ''}
      </div>

      <!-- Supplier Box -->
      <div class="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
        <div>
          <span class="text-[10px] uppercase font-bold text-slate-400">Supplier</span>
          <h5 class="text-xs font-bold text-slate-900 mt-0.5">${escapeHtml(order.sellerName || order.sellerBusinessName || 'Verified Supplier')}</h5>
          <p class="text-[11px] text-slate-500">${escapeHtml(order.sellerLocation || order.sellerAddress || 'Regional Warehouse')}</p>
        </div>
        ${order.sellerPhone ? `
          <a href="tel:${escapeHtml(order.sellerPhone)}" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs">
            <i class="fa-solid fa-phone"></i> Call
          </a>
        ` : ''}
      </div>

      <!-- Financial Totals -->
      <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
        <div class="flex justify-between">
          <span class="text-slate-500">Material Subtotal:</span>
          <span class="font-semibold text-slate-800">₹${Number(order.subtotal || order.materialAmount || 0).toLocaleString("en-IN")}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-500">Transportation / Freight:</span>
          <span class="font-semibold text-slate-800">₹${Number(order.freight || order.transportationAmount || 0).toLocaleString("en-IN")}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-500">GST / Tax:</span>
          <span class="font-semibold text-slate-800">₹${Number(order.tax || order.taxGst || 0).toLocaleString("en-IN")}</span>
        </div>
        <div class="flex justify-between pt-1 border-t border-slate-200 text-sm font-extrabold text-slate-900">
          <span>Total Payable:</span>
          <span class="text-emerald-700">₹${Number(order.totalAmount || 0).toLocaleString("en-IN")}</span>
        </div>
      </div>

      <div class="flex justify-end pt-2">
        <button onclick="closeModal('modal-order-tracking')" class="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs transition">
          Close
        </button>
      </div>
    </div>
  `;

  openModal('modal-order-tracking');
}

async function handleAcceptProQuotation(quoteId) {
  const token = getCleanToken();
  if (!token) {
    showToast("Please log in to accept quotations.", "error");
    return;
  }

  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/quotations/${encodeURIComponent(quoteId)}/accept`, {
      method: "PUT",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      }
    });

    if (res.ok) {
      showToast("Quotation accepted successfully! Order generated.", "success");
      await fetchProfessionalRequests();
      await fetchProfessionalOrders();
    } else {
      const errData = await res.json().catch(() => ({}));
      showToast(errData.error || "Failed to accept quotation.", "error");
    }
  } catch (err) {
    console.error("Error accepting quotation:", err);
    showToast("Network error while accepting quotation.", "error");
  }
}

async function handleRejectProQuotation(quoteId) {
  const token = getCleanToken();
  if (!token) {
    showToast("Please log in to reject quotations.", "error");
    return;
  }

  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/quotations/${encodeURIComponent(quoteId)}/reject`, {
      method: "PUT",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      }
    });

    if (res.ok) {
      showToast("Quotation declined.", "info");
      await fetchProfessionalRequests();
    } else {
      const errData = await res.json().catch(() => ({}));
      showToast(errData.error || "Failed to decline quotation.", "error");
    }
  } catch (err) {
    console.error("Error rejecting quotation:", err);
    showToast("Network error while declining quotation.", "error");
  }
}

