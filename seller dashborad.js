/* =========================================================
   BUILDBID - PROFESSIONAL DASHBOARD JS
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  /* =====================================================
     DATA
     ===================================================== */

  let projects = JSON.parse(
    localStorage.getItem("buildbid_projects")
  ) || [
    {
      title: "Material Supply - Bulk Cement (100 Tons)",
      location: "Indore, Madhya Pradesh",
      budget: "₹4 - 5 Lakhs",
      status: "Bidding Open",
      action: "Bid Submitted",
      time: "2 hours ago",
      icon: "🚚"
    },
    {
      title: "Interior Design Concept - Luxury Apartment",
      location: "Bhopal, Madhya Pradesh",
      budget: "₹3 - 4 Lakhs",
      status: "Pending Review",
      action: "Project Started",
      time: "1 day ago",
      icon: "🎨"
    },
    {
      title: "Structural Engineering Analysis - New Office Block",
      location: "Indore, Madhya Pradesh",
      budget: "Engineering Bid 1",
      status: "Quoted",
      action: "Waiting for Response",
      time: "2 days ago",
      icon: "🏗️"
    },
    {
      title: "Solar Panel Installation - School Project",
      location: "Indore, Madhya Pradesh",
      budget: "₹12 - 15 Lakhs",
      status: "Submitted",
      action: "Project Completed",
      time: "5 days ago",
      icon: "☀️"
    }
  ];

  const jobs = [
    {
      date: "29",
      month: "AUG",
      title: "Site Visit - Structural Engineer",
      location: "Indore, MP",
      time: "10:00 AM",
      icon: "👷"
    },
    {
      date: "31",
      month: "AUG",
      title: "Design Presentation - Living Room",
      location: "Bhopal, MP",
      time: "11:30 AM",
      icon: "🎨"
    },
    {
      date: "02",
      month: "SEP",
      title: "Material Delivery - Steel",
      location: "Ujjain, MP",
      time: "04:00 PM",
      icon: "🏗️"
    },
    {
      date: "05",
      month: "SEP",
      title: "Material Delivery - Steel",
      location: "Indore, MP",
      time: "12:00 PM",
      icon: "🚚"
    }
  ];


  /* =====================================================
     SIDEBAR
     ===================================================== */

  const sidebar = document.getElementById("sidebar");
  const menuBtn = document.getElementById("menuBtn");

  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }


  /* =====================================================
     SIDEBAR NAVIGATION
     ===================================================== */

  const navLinks = document.querySelectorAll(
    ".nav-link, nav a"
  );

  navLinks.forEach(link => {

    link.addEventListener("click", function(e) {

      e.preventDefault();

      navLinks.forEach(item => {
        item.classList.remove("active");
      });

      this.classList.add("active");

      const page =
        this.dataset.page ||
        this.textContent.trim();

      const pageTitle =
        document.getElementById("pageTitle");

      if (pageTitle) {

        const titles = {
          dashboard: "Rohit Kumar 👋 - Professional & Service Provider",
          profile: "My Profile",
          services: "My Services",
          skills: "Skills",
          portfolio: "Portfolio",
          inventory: "Material Inventory",
          projects: "Projects & Bids",
          quotes: "Quotes",
          bookings: "Bookings / Jobs",
          earnings: "Earnings",
          cooperative: "Cooperative Hub",
          messages: "Messages",
          notifications: "Notifications",
          settings: "Settings"
        };

        const key =
          String(page)
            .toLowerCase()
            .replaceAll(" ", "")
            .replaceAll("&", "");

        pageTitle.textContent =
          titles[key] || page;
      }

      if (window.innerWidth <= 768) {
        sidebar?.classList.remove("open");
      }

    });

  });


  /* =====================================================
     PROJECTS
     ===================================================== */

  function renderProjects() {

    const container =
      document.getElementById("projectList");

    if (!container) return;

    container.innerHTML = "";

    projects.forEach((project, index) => {

      const item =
        document.createElement("div");

      item.className = "project-item";

      item.innerHTML = `

        <div class="project-icon">
          ${project.icon}
        </div>

        <div class="project-info">

          <h3>
            ${project.title}
          </h3>

          <p>
            ${project.location}
          </p>

          <strong>
            Budget: ${project.budget}
          </strong>

        </div>

        <div class="project-status">

          <span class="status">
            ${project.status}
          </span>

          <small>
            ${project.action}
          </small>

          <small>
            ${project.time}
          </small>

        </div>

        <button
          class="project-arrow"
          onclick="openProject(${index})">
          →
        </button>

      `;

      container.appendChild(item);

    });

  }


  /* =====================================================
     UPCOMING JOBS
     ===================================================== */

  function renderJobs() {

    const container =
      document.getElementById("jobList");

    if (!container) return;

    container.innerHTML = "";

    jobs.forEach((job, index) => {

      const item =
        document.createElement("div");

      item.className = "job-item";

      item.innerHTML = `

        <div class="job-date">

          <strong>
            ${job.date}
          </strong>

          <span>
            ${job.month}
          </span>

        </div>

        <div class="job-info">

          <h3>
            ${job.title}
          </h3>

          <p>
            ${job.location}
          </p>

          <small>
            🕐 ${job.time}
          </small>

        </div>

        <div class="job-icon">
          ${job.icon}
        </div>

      `;

      item.addEventListener("click", () => {

        showToast(
          `${job.title} - ${job.time}`
        );

      });

      container.appendChild(item);

    });

  }


  /* =====================================================
     NEW QUOTE
     ===================================================== */

  const newQuoteBtn =
    document.getElementById("newQuoteBtn");

  if (newQuoteBtn) {

    newQuoteBtn.addEventListener("click", () => {

      openQuoteModal();

    });

  }


  /* =====================================================
     VIEW ALL
     ===================================================== */

  const viewAll =
    document.getElementById("viewAll");

  if (viewAll) {

    viewAll.addEventListener("click", () => {

      showToast(
        "Opening all projects & bids..."
      );

    });

  }


  /* =====================================================
     CALENDAR
     ===================================================== */

  const calendarBtn =
    document.getElementById("viewCalendar");

  if (calendarBtn) {

    calendarBtn.addEventListener("click", () => {

      showToast(
        "Calendar opened 📅"
      );

    });

  }


  /* =====================================================
     JOIN NOW
     ===================================================== */

  const joinBtn =
    document.getElementById("joinNow");

  if (joinBtn) {

    joinBtn.addEventListener("click", () => {

      showToast(
        "You joined the Design Consortium 🎉"
      );

    });

  }


  /* =====================================================
     FORM GROUP / MATERIAL SUPPLIER
     ===================================================== */

  const groupBtn =
    document.getElementById("formGroup");

  if (groupBtn) {

    groupBtn.addEventListener("click", () => {

      showToast(
        "Material Suppliers Group created!"
      );

    });

  }


  /* =====================================================
     SEARCH
     ===================================================== */

  const searchInput =
    document.getElementById("searchInput");

  if (searchInput) {

    searchInput.addEventListener(
      "input",
      function() {

        const search =
          this.value.toLowerCase().trim();

        const projectItems =
          document.querySelectorAll(
            ".project-item"
          );

        projectItems.forEach(item => {

          const text =
            item.textContent.toLowerCase();

          item.style.display =
            text.includes(search)
              ? ""
              : "none";

        });

        const jobItems =
          document.querySelectorAll(
            ".job-item"
          );

        jobItems.forEach(item => {

          const text =
            item.textContent.toLowerCase();

          item.style.display =
            text.includes(search)
              ? ""
              : "none";

        });

      }
    );

  }


  /* =====================================================
     NOTIFICATIONS
     ===================================================== */

  const notificationBtn =
    document.getElementById(
      "notificationBtn"
    );

  if (notificationBtn) {

    notificationBtn.addEventListener(
      "click",
      () => {

        showToast(
          "You have 3 new notifications 🔔"
        );

      }
    );

  }


  /* =====================================================
     MESSAGES
     ===================================================== */

  const messageBtn =
    document.getElementById("messageBtn");

  if (messageBtn) {

    messageBtn.addEventListener(
      "click",
      () => {

        showToast(
          "You have 3 unread messages 💬"
        );

      }
    );

  }


  /* =====================================================
     DARK MODE
     ===================================================== */

  const themeBtn =
    document.getElementById("themeBtn");

  if (themeBtn) {

    themeBtn.addEventListener(
      "click",
      toggleDarkMode
    );

  }

  if (
    localStorage.getItem(
      "buildbid_darkmode"
    ) === "true"
  ) {

    document.body.classList.add("dark");

    if (themeBtn) {
      themeBtn.textContent = "☀️";
    }

  }


  function toggleDarkMode() {

    document.body.classList.toggle("dark");

    const dark =
      document.body.classList.contains("dark");

    localStorage.setItem(
      "buildbid_darkmode",
      dark
    );

    if (themeBtn) {

      themeBtn.textContent =
        dark ? "☀️" : "🌙";

    }

    showToast(
      dark
        ? "Dark mode enabled"
        : "Light mode enabled"
    );

  }


  /* =====================================================
     PROJECT DETAILS
     ===================================================== */

  window.openProject = function(index) {

    const project = projects[index];

    showToast(
      `${project.title} selected`
    );

  };


  /* =====================================================
     QUOTE MODAL
     ===================================================== */

  function openQuoteModal() {

    let modal =
      document.getElementById(
        "quoteModal"
      );

    if (!modal) {

      modal =
        document.createElement("div");

      modal.id = "quoteModal";

      modal.className = "modal";

      modal.innerHTML = `

        <div class="modal-box">

          <div class="modal-header">

            <h2>
              Create New Quote
            </h2>

            <button
              id="closeQuote">
              ×
            </button>

          </div>

          <form id="quoteForm">

            <label>
              Project Name
            </label>

            <input
              id="quoteProject"
              type="text"
              placeholder="Enter project name"
              required
            >

            <label>
              Quote Amount
            </label>

            <input
              id="quoteAmount"
              type="number"
              placeholder="₹ Enter amount"
              required
            >

            <label>
              Service
            </label>

            <select id="quoteService">

              <option>
                Construction
              </option>

              <option>
                Interior Design
              </option>

              <option>
                Material Supply
              </option>

              <option>
                Engineering
              </option>

              <option>
                Solar Installation
              </option>

            </select>

            <button
              type="submit"
              class="primary-btn full">

              Submit Quote

            </button>

          </form>

        </div>

      `;

      document.body.appendChild(modal);

      document
        .getElementById("closeQuote")
        .addEventListener(
          "click",
          () => {
            modal.classList.remove("show");
          }
        );

      document
        .getElementById("quoteForm")
        .addEventListener(
          "submit",
          function(e) {

            e.preventDefault();

            const project =
              document.getElementById(
                "quoteProject"
              ).value;

            const amount =
              document.getElementById(
                "quoteAmount"
              ).value;

            modal.classList.remove("show");

            this.reset();

            showToast(
              `Quote submitted for ${project} - ₹${Number(amount).toLocaleString("en-IN")}`
            );

          }
        );

    }

    modal.classList.add("show");

  }


  /* =====================================================
     PROFILE
     ===================================================== */

  const profile =
    document.querySelector(".profile");

  if (profile) {

    profile.addEventListener("click", () => {

      showToast(
        "Verified Professional Profile"
      );

    });

  }


  /* =====================================================
     TOAST
     ===================================================== */

  function showToast(message) {

    let toast =
      document.getElementById(
        "buildbidToast"
      );

    if (!toast) {

      toast =
        document.createElement("div");

      toast.id =
        "buildbidToast";

      toast.className =
        "buildbid-toast";

      document.body.appendChild(toast);

    }

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(
      window.buildbidToastTimer
    );

    window.buildbidToastTimer =
      setTimeout(() => {

        toast.classList.remove("show");

      }, 2500);

  }


  /* =====================================================
     PROFILE COMPLETION
     ===================================================== */

  const completeProfile =
    document.getElementById(
      "completeProfile"
    );

  if (completeProfile) {

    completeProfile.addEventListener(
      "click",
      () => {

        showToast(
          "Profile completion opened"
        );

      }
    );

  }


  /* =====================================================
     LOGOUT
     ===================================================== */

  const logout =
    document.getElementById("logout");

  if (logout) {

    logout.addEventListener(
      "click",
      e => {

        e.preventDefault();

        const confirmLogout =
          confirm(
            "Are you sure you want to logout?"
          );

        if (confirmLogout) {

          showToast(
            "Logged out successfully"
          );

        }

      }
    );

  }


  /* =====================================================
     ANIMATED STAT NUMBERS
     ===================================================== */

  function animateNumber(
    element,
    target
  ) {

    if (!element) return;

    let current = 0;

    const increment =
      Math.max(1, Math.ceil(target / 40));

    const timer =
      setInterval(() => {

        current += increment;

        if (current >= target) {

          current = target;

          clearInterval(timer);

        }

        element.textContent =
          current.toLocaleString("en-IN");

      }, 25);

  }


  const totalBids =
    document.getElementById("totalBids");

  const activeProjects =
    document.getElementById(
      "activeProjects"
    );

  const totalEarnings =
    document.getElementById(
      "totalEarnings"
    );

  const materialRequests =
    document.getElementById(
      "materialRequests"
    );


  animateNumber(totalBids, 28);

  animateNumber(activeProjects, 10);

  animateNumber(totalEarnings, 315000);

  animateNumber(materialRequests, 18);


  /* =====================================================
     INITIAL RENDER
     ===================================================== */

  renderProjects();

  renderJobs();

});


/* =========================================================
   GLOBAL TOAST
   ========================================================= */

function showToast(message) {

  let toast =
    document.getElementById(
      "buildbidToast"
    );

  if (!toast) {

    toast =
      document.createElement("div");

    toast.id =
      "buildbidToast";

    toast.className =
      "buildbid-toast";

    document.body.appendChild(toast);

  }

  toast.textContent = message;

  toast.classList.add("show");

  setTimeout(() => {

    toast.classList.remove("show");

  }, 2500);

}