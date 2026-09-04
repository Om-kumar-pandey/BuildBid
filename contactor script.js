/* =====================================================
   MAIN DASHBOARD HTML
===================================================== */

const dashboardHTML = `

<!-- PROFILE HERO -->

<section class="profile-hero">

    <div class="profile-left">

        <div class="company-logo">

            <div class="building-logo">

                <div class="building-icon">
                    <i class="fa-solid fa-city"></i>
                </div>

                <strong>SHIVAM</strong>

                <span>CONSTRUCTION</span>

            </div>

            <div class="camera">
                <i class="fa-solid fa-camera"></i>
            </div>

        </div>


        <div class="company-info">

            <h1>
                Shivam Construction

                <span class="verified">
                    <i class="fa-solid fa-check"></i>
                </span>

            </h1>

            <div class="company-type">

                Civil Contractor

                <span>•</span>

                8+ Years Experience

            </div>

            <div class="contact-line">
                <i class="fa-solid fa-location-dot"></i>
                Lucknow, Uttar Pradesh, India
            </div>

            <div class="contact-line">
                <i class="fa-solid fa-phone"></i>
                +91 98765 43210
            </div>

            <div class="contact-line">
                <i class="fa-regular fa-envelope"></i>
                shivamconstruction@gmail.com
            </div>

        </div>

    </div>


    <div class="profile-right">

        <div class="rating-line">

            <span class="star">
                <i class="fa-solid fa-star"></i>
            </span>

            <strong>4.6</strong>

            (128 Reviews)

        </div>

        <div class="profile-stat-row">

            <div class="profile-stat">
                <span>Projects Completed</span>
                <strong>56</strong>
            </div>

        </div>

        <div class="profile-stat-row">

            <div class="profile-stat">
                <span>Total Earnings</span>
                <strong>₹28,75,000</strong>
            </div>

        </div>

        <button
            class="edit-btn"
            onclick="openProfile()">

            <i class="fa-solid fa-pen"></i>
            &nbsp; Edit Profile

        </button>

    </div>

</section>


<!-- STAT CARDS -->

<section class="stats">

    <div class="stat-card">

        <div class="stat-top">

            <div class="stat-icon blue">
                <i class="fa-solid fa-gavel"></i>
            </div>

            <div>
                <div class="stat-name">Total Bids</div>
                <div class="stat-number">25</div>
            </div>

        </div>

        <a class="stat-link"
           onclick="loadPage('bids')">

            View all bids
            <i class="fa-solid fa-arrow-right"></i>

        </a>

        <svg class="spark"
             viewBox="0 0 70 35">

            <polyline
                points="0,28 12,18 24,25 35,12 48,20 59,8 69,3"
                stroke="#8cb4eb"/>

        </svg>

    </div>


    <div class="stat-card">

        <div class="stat-top">

            <div class="stat-icon green">
                <i class="fa-solid fa-user-clock"></i>
            </div>

            <div>
                <div class="stat-name">Active Bids</div>
                <div class="stat-number">5</div>
            </div>

        </div>

        <a class="stat-link"
           onclick="loadPage('bids')">

            View active bids
            <i class="fa-solid fa-arrow-right"></i>

        </a>

        <svg class="spark"
             viewBox="0 0 70 35">

            <polyline
                points="0,29 10,22 21,5 33,25 45,18 57,27 69,9"
                stroke="#7ecda7"/>

        </svg>

    </div>


    <div class="stat-card">

        <div class="stat-top">

            <div class="stat-icon orange">
                <i class="fa-solid fa-briefcase"></i>
            </div>

            <div>
                <div class="stat-name">Projects Won</div>
                <div class="stat-number">3</div>
            </div>

        </div>

        <a class="stat-link"
           onclick="loadPage('contracts')">

            View my contracts
            <i class="fa-solid fa-arrow-right"></i>

        </a>

        <svg class="spark"
             viewBox="0 0 70 35">

            <polyline
                points="0,27 11,16 23,24 35,12 48,22 58,13 69,3"
                stroke="#f0bf85"/>

        </svg>

    </div>


    <div class="stat-card">

        <div class="stat-top">

            <div class="stat-icon purple">
                <i class="fa-solid fa-user-group"></i>
            </div>

            <div>
                <div class="stat-name">Total Earnings</div>
                <div class="stat-number">₹28,75,000</div>
            </div>

        </div>

        <a class="stat-link"
           onclick="loadPage('earnings')">

            View earnings
            <i class="fa-solid fa-arrow-right"></i>

        </a>

        <svg class="spark"
             viewBox="0 0 70 35">

            <polyline
                points="0,28 11,22 22,4 35,9 48,28 59,17 69,4"
                stroke="#b99be1"/>

        </svg>

    </div>

</section>


<div class="dashboard-grid">

<!-- PROJECTS -->

<div class="card">

    <div class="card-header">

        <h2>Latest Projects</h2>

        <span
            class="view-all"
            onclick="loadPage('projects')">

            View All Projects
            <i class="fa-solid fa-arrow-right"></i>

        </span>

    </div>


    <div class="tabs">

        <div class="tab active"
             onclick="filterProjects('all',this)">
            All Projects
        </div>

        <div class="tab"
             onclick="filterProjects('open',this)">
            Open for Bidding
        </div>

        <div class="tab"
             onclick="filterProjects('upcoming',this)">
            Upcoming
        </div>

        <div class="tab"
             onclick="filterProjects('won',this)">
            Won Projects
        </div>

    </div>


    <div class="project-list"
         id="dashboardProjects">

        ${projectRow(
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80",
            "3BHK Residential House Construction",
            "Gomti Nagar, Lucknow, UP",
            "₹18.00 – ₹22.00 Lakh",
            "12 May 2025",
            "8",
            "open"
        )}

        ${projectRow(
            "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=300&q=80",
            "Commercial Building Construction",
            "Hazratganj, Lucknow, UP",
            "₹1.20 – ₹1.50 Cr",
            "10 May 2025",
            "12",
            "open"
        )}

        ${projectRow(
            "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=300&q=80",
            "Warehouse Construction",
            "Sitapur Road, Lucknow, UP",
            "₹35.00 – ₹40.00 Lakh",
            "08 May 2025",
            "5",
            "open"
        )}

        ${projectRow(
            "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=300&q=80",
            "Interior Work – Office Space",
            "Aliganj, Lucknow, UP",
            "₹8.00 – ₹12.00 Lakh",
            "05 May 2025",
            "6",
            "won"
        )}

    </div>

</div>


<!-- RIGHT -->

<div>

    <!-- PERFORMANCE -->

    <div class="card right-card">

        <div class="card-header">

            <h2>My Performance</h2>

            <span class="view-all">
                View All
                <i class="fa-solid fa-arrow-right"></i>
            </span>

        </div>

        <div class="performance">

            ${performanceRow(
                "fa-solid fa-bullseye",
                "Response Rate",
                "92%"
            )}

            ${performanceRow(
                "fa-solid fa-building",
                "Projects Completed",
                "56"
            )}

            ${performanceRow(
                "fa-solid fa-clock",
                "On-Time Delivery",
                "88%"
            )}

            ${performanceRow(
                "fa-solid fa-star",
                "Customer Rating",
                "4.6 / 5"
            )}

        </div>

    </div>


    <!-- NOTIFICATIONS -->

    <div class="card right-card">

        <div class="card-header">

            <h2>Recent Notifications</h2>

            <span
                class="view-all"
                onclick="loadPage('notifications')">

                View All
                <i class="fa-solid fa-arrow-right"></i>

            </span>

        </div>

        <div class="notifications">

            ${notification(
                "fa-solid fa-eye",
                'Your bid for "3BHK House Construction" has been viewed by customer.',
                "1h ago"
            )}

            ${notification(
                "fa-solid fa-comments",
                "You have received a new message from Rahul Verma.",
                "3h ago"
            )}

            ${notification(
                "fa-solid fa-arrow-trend-up",
                'Your bid for "Commercial Building" is leading.',
                "5h ago"
            )}

            ${notification(
                "fa-solid fa-trophy",
                'Congratulations! You won a project "Interior Work – Office Space".',
                "1d ago"
            )}

        </div>

    </div>

</div>

</div>


<!-- BOTTOM -->

<div class="grow-banner">

    <div class="grow-left">

        <div class="grow-icon">
            <i class="fa-solid fa-file-circle-check"></i>
        </div>

        <div>

            <h3>
                Get More Projects & Grow Your Business
            </h3>

            <p>
                Upgrade to Premium to get more leads,
                higher visibility and priority support.
            </p>

        </div>

    </div>

    <button
        class="grow-btn"
        onclick="upgradePremium()">

        <i class="fa-solid fa-crown"></i>
        &nbsp; Upgrade Now

    </button>

</div>

`;


/* =====================================================
   PROJECT ROW FUNCTION
===================================================== */

function projectRow(
    image,
    name,
    location,
    budget,
    date,
    bids,
    status
){

    let statusText =
        status === "won"
        ? "Won"
        : "Open for Bidding";

    return `

    <div class="project-row"
         data-status="${status}">

        <div>
            <img
                class="project-img"
                src="${image}"
                alt="Project">
        </div>

        <div>

            <div class="project-name">
                ${name}
            </div>

            <div class="project-location">
                ${location}
            </div>

            <div class="project-budget">
                Budget: ${budget}
            </div>

        </div>

        <div>

            <div class="project-label">
                Posted On
            </div>

            <div class="project-date">
                ${date}
            </div>

        </div>

        <div>

            <div class="project-label">
                Bids
            </div>

            <div class="project-bids">
                ${bids}
            </div>

        </div>

        <div style="text-align:right">

            <div class="open-bidding">
                ${statusText}
            </div>

            <button
                class="details-btn"
                onclick="projectDetails('${name}')">

                View Details

            </button>

        </div>

    </div>

    `;
}


/* =====================================================
   PERFORMANCE FUNCTION
===================================================== */

function performanceRow(icon,label,value){

    return `

    <div class="performance-row">

        <div class="performance-left">

            <div class="performance-icon">

                <i class="${icon}"></i>

            </div>

            <span class="performance-label">
                ${label}
            </span>

        </div>

        <strong class="performance-value">
            ${value}
        </strong>

    </div>

    `;
}


/* =====================================================
   NOTIFICATION FUNCTION
===================================================== */

function notification(icon,text,time){

    return `

    <div class="notification">

        <div class="notification-icon">

            <i class="${icon}"></i>

        </div>

        <div class="notification-text">

            <p>${text}</p>

            <div class="notification-time">
                ${time}
            </div>

        </div>

        <span class="notification-dot"></span>

    </div>

    `;
}


/* =====================================================
   LOAD PAGE
===================================================== */


function loadPage(page,element){

    document.body.classList.remove("post-requirement-mode");

    if(element){

        document
            .querySelectorAll(".side-menu a")
            .forEach(a => a.classList.remove("active"));

        document
            .querySelectorAll(".top-nav a")
            .forEach(a => a.classList.remove("active"));

        element.classList.add("active");

    }

    /* find sidebar corresponding item */

    document
        .querySelectorAll(".side-menu a")
        .forEach(a => {

            if(a.dataset.page === page){

                document
                    .querySelectorAll(".side-menu a")
                    .forEach(x =>
                        x.classList.remove("active")
                    );

                a.classList.add("active");

            }

        });


    const main =
        document.getElementById("mainContent");


    if(page === "dashboard"){

        main.innerHTML = dashboardHTML;

        return;
    }


    if(page === "orders"){

        main.innerHTML = ordersHTML();

        return;
    }


    if(page === "track"){

        main.innerHTML = trackHTML();

        return;
    }


    if(page === "projects"){

        main.innerHTML = projectsHTML();

        return;
    }


    if(page === "invoice"){

        main.innerHTML = invoiceHTML();

        return;
    }


    if(page === "bids"){

        main.innerHTML = bidsHTML();

        return;
    }


    if(page === "contracts"){

        main.querySelectorAll('.profile-hero').forEach(el => el.remove());
        main.innerHTML = contractsHTML();
        renderContracts('all');

        return;
    }


    if(page === "materials"){

        main.innerHTML = materialsHTML();
        initMaterialsRFQ();

        return;
    }


    if(page === "earnings"){

        main.innerHTML = earningsHTML();

        return;
    }


    if(page === "notifications"){

        main.innerHTML = notificationsHTML();

        return;
    }


    if(page === "messages"){

        main.innerHTML = simplePage(
            "Messages",
            "Communicate with customers and project teams.",
            "fa-message"
        );

        return;
    }
if(page === "post-requirement"){
        document.body.classList.add("post-requirement-mode");
        main.innerHTML = postRequirementHTML();
        initPostRequirement();
        return;
    }


    if(page === "professionals"){
        main.innerHTML = professionalsHTML();
        renderProfessionals();
        return;
    }


    if(page === "team"){

        main.innerHTML = simplePage(
            "My Team",
            "Manage your supervisors and construction team.",
            "fa-user-group"
        );

        return;
    }


    if(page === "reviews"){

        main.innerHTML = simplePage(
            "Reviews & Ratings",
            "View customer feedback and ratings.",
            "fa-star"
        );

        return;
    }


    if(page === "documents"){

        main.innerHTML = simplePage(
            "Documents",
            "Manage your contractor documents.",
            "fa-file"
        );

        return;
    }


    if(page === "verified"){
        main.innerHTML = verificationHTML();
        initVerification();
        return;
    }


    if(page === "help"){

        main.innerHTML = simplePage(
            "Help & Support",
            "Get help with your BuildBid account.",
            "fa-circle-question"
        );

        return;
    }

}


/* =====================================================
   MY ORDERS
===================================================== */

function ordersHTML(){

return `

<div class="page-title">

    <div>
        <h1>My Orders</h1>

        <p>
            Manage construction material orders
            placed through BuildBid.
        </p>
    </div>

    <button
        class="action-btn"
        onclick="showToast('New material order started')">

        <i class="fa-solid fa-plus"></i>
        New Order

    </button>

</div>


<div class="dynamic-card">

    <div class="dynamic-toolbar">

        <div class="search-box">

            <i class="fa-solid fa-search"></i>

            <input
                placeholder="Search orders..."
                onkeyup="searchOrders(this.value)">

        </div>


        <div class="filter-buttons">

            <button
                class="filter-btn active"
                onclick="filterOrders('all',this)">
                All
            </button>

            <button
                class="filter-btn"
                onclick="filterOrders('processing',this)">
                Processing
            </button>

            <button
                class="filter-btn"
                onclick="filterOrders('shipped',this)">
                Shipped
            </button>

            <button
                class="filter-btn"
                onclick="filterOrders('delivered',this)">
                Delivered
            </button>

        </div>

    </div>


    <div id="ordersList">

        ${orderItem(
            "ORD-1024",
            "UltraTech Cement",
            "100 Bags",
            "₹42,000",
            "12 Sep 2026",
            "processing",
            "Processing"
        )}

        ${orderItem(
            "ORD-1023",
            "TMT Steel Bars",
            "2.5 Tons",
            "₹1,85,000",
            "10 Sep 2026",
            "shipped",
            "Shipped"
        )}

        ${orderItem(
            "ORD-1022",
            "Red Bricks",
            "8,000 Bricks",
            "₹56,000",
            "08 Sep 2026",
            "delivered",
            "Delivered"
        )}

        ${orderItem(
            "ORD-1021",
            "River Sand",
            "5 Trucks",
            "₹72,500",
            "06 Sep 2026",
            "pending",
            "Payment Pending"
        )}

    </div>

</div>

`;
}


function orderItem(
    id,
    name,
    quantity,
    price,
    date,
    status,
    statusText
){

return `

<div class="order-item"
     data-order-status="${status}">

    <div>

        <div class="order-id">
            ${id}
        </div>

        <div class="order-name">
            ${name}
        </div>

        <div class="order-sub">
            ${quantity}
        </div>

    </div>


    <div>

        <div class="order-label">
            Amount
        </div>

        <div class="order-value">
            ${price}
        </div>

    </div>


    <div>

        <div class="order-label">
            Expected
        </div>

        <div class="order-value">
            ${date}
        </div>

    </div>


    <div>

        <span class="status-pill status-${status}">
            ${statusText}
        </span>

    </div>


    <div>

        <button
            class="details-btn"
            onclick="trackOrder('${id}')">

            Track Order

        </button>

    </div>

</div>

`;
}


/* =====================================================
   TRACK MATERIAL
===================================================== */

function trackHTML(){

return `

<div class="page-title">

    <div>

        <h1>Track Material</h1>

        <p>
            Track your construction material
            delivery in real time.
        </p>

    </div>

    <button
        class="action-btn"
        onclick="showToast('Tracking information refreshed')">

        <i class="fa-solid fa-rotate"></i>
        Refresh

    </button>

</div>


<div class="material-grid">

    <div class="material-card">

        <div class="material-header">

            <div>

                <h3>
                    UltraTech Cement - 100 Bags
                </h3>

                <div class="tracking-number">
                    Tracking ID: BB-MAT-1024
                </div>

            </div>

            <span class="status-pill status-processing">
                In Transit
            </span>

        </div>


        <div class="track-progress">

            <div class="track-step done">

                <div class="track-circle">
                    <i class="fa-solid fa-check"></i>
                </div>

                <span>Order Placed</span>

                <strong>08 Sep</strong>

            </div>


            <div class="track-step done">

                <div class="track-circle">
                    <i class="fa-solid fa-check"></i>
                </div>

                <span>Confirmed</span>

                <strong>08 Sep</strong>

            </div>


            <div class="track-step active">

                <div class="track-circle">
                    <i class="fa-solid fa-truck"></i>
                </div>

                <span>In Transit</span>

                <strong>Today</strong>

            </div>


            <div class="track-step">

                <div class="track-circle">
                    <i class="fa-solid fa-location-dot"></i>
                </div>

                <span>Out for Delivery</span>

                <strong>Tomorrow</strong>

            </div>


            <div class="track-step">

                <div class="track-circle">
                    <i class="fa-solid fa-house"></i>
                </div>

                <span>Delivered</span>

                <strong>12 Sep</strong>

            </div>

        </div>


        <div class="delivery-info">

            <div>

                <p>Expected Delivery</p>

                <strong>
                    12 September 2026
                </strong>

            </div>

            <div>

                <p>Current Location</p>

                <strong>
                    Lucknow Distribution Center
                </strong>

            </div>

            <div class="delivery-icon">
                <i class="fa-solid fa-truck-fast"></i>
            </div>

        </div>

    </div>


    <div class="material-card">

        <div class="material-header">

            <h3>Tracking History</h3>

        </div>


        <div class="timeline-item">

            <div class="timeline-dot"></div>

            <div class="timeline-content">

                <h4>
                    Material reached Lucknow
                </h4>

                <p>
                    Lucknow Distribution Center
                </p>

                <div class="timeline-time">
                    Today, 10:30 AM
                </div>

            </div>

        </div>


        <div class="timeline-item">

            <div class="timeline-dot"></div>

            <div class="timeline-content">

                <h4>
                    Shipment dispatched
                </h4>

                <p>
                    Kanpur Material Warehouse
                </p>

                <div class="timeline-time">
                    Yesterday, 06:20 PM
                </div>

            </div>

        </div>


        <div class="timeline-item">

            <div class="timeline-dot"></div>

            <div class="timeline-content">

                <h4>
                    Order confirmed
                </h4>

                <p>
                    BuildBid Material Partner
                </p>

                <div class="timeline-time">
                    08 Sep, 02:15 PM
                </div>

            </div>

        </div>

    </div>

</div>


<div class="dynamic-card" style="margin-top:15px;">

    <div class="card-header">

        <h2>Other Active Shipments</h2>

    </div>

    <div class="order-item">

        <div>

            <div class="order-id">
                ORD-1023
            </div>

            <div class="order-name">
                TMT Steel Bars
            </div>

            <div class="order-sub">
                2.5 Tons
            </div>

        </div>

        <div>

            <div class="order-label">
                Current Location
            </div>

            <div class="order-value">
                Unnao
            </div>

        </div>

        <div>

            <div class="order-label">
                Delivery
            </div>

            <div class="order-value">
                10 Sep 2026
            </div>

        </div>

        <div>
            <span class="status-pill status-shipped">
                Shipped
            </span>
        </div>

        <div>
            <button
                class="details-btn"
                onclick="showToast('Steel shipment selected')">

                View

            </button>
        </div>

    </div>

</div>

`;
}


function projectsHTML(){
return `
<div class="projects-hero">
    <div class="projects-profile">
        <div class="projects-logo">
            <div class="building-logo">
                <div class="building-icon"><i class="fa-solid fa-city"></i></div>
                <strong>SHIVAM</strong><span>CONSTRUCTION</span>
            </div>
            <img class="projects-avatar" src="https://i.pravatar.cc/100?img=12" alt="Contractor">
        </div>
        <div class="projects-company">
            <h1>Shivam Construction - Lucknow, India</h1>
            <span class="completed-badge">Total Completed Projects: 56</span>
        </div>
    </div>
    <div class="invoice-area">
        <div class="invoice-icon"><i class="fa-regular fa-file-lines"></i></div>
        <button class="invoice-btn" onclick="loadPage('invoice',this)"><i class="fa-solid fa-plus"></i>&nbsp; Create New Invoice</button>
    </div>
</div>

<div class="opportunity-stats">
    ${projectOpportunityCard('opp-blue','fa-bullhorn','Open Opportunities','145+','New requests today: 12','View all requirements →','0,29 12,24 23,28 34,16 45,20 57,5 69,10','#70a5d8')}
    ${projectOpportunityCard('opp-orange','fa-gavel','My Active Bids','5','Bids under review: 3','View my bids →','0,30 12,28 23,20 34,23 46,15 57,8 69,5','#c4a35e')}
    ${projectOpportunityCard('opp-green','fa-check','My Won Bids','3','Projects recently secured: 1','View my contract portfolio →','0,28 12,26 24,18 35,21 47,10 58,14 69,4','#69a989')}
    ${projectOpportunityCard('opp-red','fa-clock','Bid Deadlines Soon','8','Deadlines within 24 hours: 2','View urgent bids →','0,28 11,24 22,29 33,15 45,21 56,8 69,12','#b98181')}
</div>

<div class="projects-content-grid">
    <div class="requirements-card">
        <div class="requirements-header">
            <h2>Explore Requirements</h2>
            <div class="requirements-tools">
                <div class="project-search">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <input id="requirementSearch" type="text" placeholder="Search customer requests..." onkeyup="searchRequirements(this.value)">
                </div>
                <button class="project-filter" onclick="showToast('Showing completed requirements')">Completed</button>
                <button class="project-filter" onclick="showToast('Requirement status filter opened')">Pending <i class="fa-solid fa-chevron-down"></i></button>
            </div>
        </div>
        <div class="project-tabs">
            <div class="project-tab active" onclick="switchProjectTab(this,'requirements')">Explore Requirements</div>
            <div class="project-tab" onclick="switchProjectTab(this,'active-bids')">My Active Bids</div>
            <div class="project-tab" onclick="switchProjectTab(this,'history')">My Bidding History</div>
        </div>
        <div class="filter-row">
            <button class="filter-select" onclick="showToast('Project type filter opened')">Project Type <i class="fa-solid fa-chevron-down"></i></button>
            <button class="filter-select" onclick="showToast('Budget filter opened')">Budget Range <i class="fa-solid fa-chevron-down"></i></button>
            <button class="filter-select" onclick="showToast('Urgency filter opened')">Urgency <i class="fa-solid fa-chevron-down"></i></button>
        </div>
        <div id="projectRequirementsList">
            ${requirementRow('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80','Require Builder for 3BHK Apartment - Sector 15','Mrs. Kapadia','Budget ₹18 Lakhs','₹18-20 Lakhs','July 30, 2025')}
            ${requirementRow('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=300&q=80','Office Interior Work - Hazratganj','TechSolutions Inc.','Budget ₹1.2 Cr','₹1.2-1.5 Cr','July 25, 2025')}
            ${requirementRow('https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=300&q=80','Warehouse Construction Requirement - Kanpur Road','Fresh Express Logistics','Budget ₹35 Lakhs','₹35-40 Lakhs','Aug 10, 2025')}
        </div>
    </div>

    <div>
        <div class="performance-card">
            <div class="side-card-header"><h2>My Bidding Performance</h2></div>
            <div class="performance-body">
                <div class="performance-stat"><span>Bid Success Rate</span><strong>60%</strong></div>
                <div class="performance-stat"><span>Average Bid Response Time</span><strong>4 hrs</strong></div>
                <div class="performance-stat"><span>Customer Rating (Bidding)</span><strong>4.8/5</strong></div>
            </div>
        </div>
        <div class="capacity-card">
            <div class="side-card-header"><h2>Capacity for New Projects</h2></div>
            <div class="capacity-body">
                ${capacityRow('Gomti Villa Construction','10 / 30%','33%')}
                ${capacityRow('Aliganj Commercial Complex','10 / 40%','25%')}
                ${capacityRow('Top Project 3','10 / 30%','33%')}
            </div>
        </div>
        <div class="deadlines-card">
            <div class="side-card-header"><h2>Upcoming Bid Deadlines</h2></div>
            <div class="deadline-body">
                ${deadlineRow('Kapadia 3BHK','14 days remaining','30 July',true,true)}
                ${deadlineRow('TechSolutions Interior','14 days remaining','25 July',false,true)}
                ${deadlineRow('Fresh Express Warehouse','','10 Aug',false,false)}
            </div>
        </div>
    </div>
</div>

<div class="grow-banner projects-premium">
    <div class="grow-left">
        <div class="grow-icon"><i class="fa-solid fa-file-circle-check"></i></div>
        <div><h3>Get More Projects & Grow Your Business</h3><p>Upgrade to Premium to get more leads, higher visibility and priority support.</p></div>
    </div>
    <button class="grow-btn" onclick="upgradePremium()"><i class="fa-solid fa-crown"></i>&nbsp; Upgrade Now</button>
</div>
`;
}

function projectOpportunityCard(iconClass,icon,name,number,info,link,points,stroke){
return `<div class="opportunity-card"><div class="opportunity-top"><div class="opportunity-icon ${iconClass}"><i class="fa-solid ${icon}"></i></div><div><div class="opportunity-name">${name}</div><div class="opportunity-number">${number}</div></div></div><div class="opportunity-info">${info}</div><span class="opportunity-link">${link}</span><svg class="mini-chart" viewBox="0 0 70 35"><polyline points="${points}" stroke="${stroke}"></polyline></svg></div>`;
}

function requirementRow(image,name,customer,budget,value,deadline,requirementId=''){
return `<div class="requirement-item" data-project-name="${name.toLowerCase()}" data-requirement-id="${requirementId}"><img class="requirement-image" src="${image}" alt="Project"><div class="requirement-main"><h3>${name}</h3><p>Customer: ${customer}</p><span class="requirement-budget">Status/Budget: ${budget}</span></div><div class="requirement-right"><div class="estimated-value">Estimated Value: <strong>${value}</strong></div><div class="deadline">Deadline: ${deadline}</div><div class="requirement-actions"><button class="view-details-btn" onclick="viewRequirement('${name.replace(/'/g,"\'")}')">View Details</button><button class="submit-bid-btn" onclick="openBidProposal('${requirementId}','${name.replace(/'/g,"\'")}')">Submit Bid Proposal</button></div></div></div>`;}

function capacityRow(name,value,width){return `<div class="capacity-project"><div class="capacity-title"><span>${name}</span><strong>${value}</strong></div><div class="capacity-bar"><div class="capacity-fill" style="width:${width}"></div></div></div>`;}
function deadlineRow(name,remaining,date,blue,line){return `<div class="deadline-item"><div><div class="deadline-dot" style="background:${blue?'#2673bd':'#ddd'};border-color:${blue?'#dcecff':'#eee'}"></div>${line?'<div class="deadline-line"></div>':''}</div><div><div class="deadline-name">${name}</div>${remaining?`<div class="deadline-remaining">${remaining}</div>`:''}</div><div class="deadline-date">${date}</div></div>`;}

function searchRequirements(value){
const q=value.trim().toLowerCase();
document.querySelectorAll('#projectRequirementsList .requirement-item').forEach(item=>{item.style.display=(!q || item.dataset.projectName.includes(q))?'grid':'none';});
}

function switchProjectTab(element,tab){
document.querySelectorAll('.project-tab').forEach(x=>x.classList.remove('active')); element.classList.add('active');
const list=document.getElementById('projectRequirementsList'); if(!list)return;
if(tab==='requirements'){list.innerHTML=`${requirementRow('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80','Require Builder for 3BHK Apartment - Sector 15','Mrs. Kapadia','Budget ₹18 Lakhs','₹18-20 Lakhs','July 30, 2025')}${requirementRow('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=300&q=80','Office Interior Work - Hazratganj','TechSolutions Inc.','Budget ₹1.2 Cr','₹1.2-1.5 Cr','July 25, 2025')}${requirementRow('https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=300&q=80','Warehouse Construction Requirement - Kanpur Road','Fresh Express Logistics','Budget ₹35 Lakhs','₹35-40 Lakhs','Aug 10, 2025')}`;}
else if(tab==='active-bids'){list.innerHTML=`<div class="project-empty"><i class="fa-solid fa-gavel"></i><strong>5 active bids</strong><br>Three bids are currently under customer review.</div>`;}
else{list.innerHTML=`<div class="project-empty"><i class="fa-solid fa-clock-rotate-left"></i><strong>Bidding history</strong><br>Your completed and withdrawn bid history will appear here.</div>`;}
}

function viewRequirement(name){showToast('Opening details: '+name);}
function submitBid(name){showToast('Bid proposal started for '+name);}


/* =====================================================
   CREATE NEW INVOICE
===================================================== */
function invoiceHTML(){
return `
<div class="invoice-page">

    <div class="invoice-project-bar">

        <div class="invoice-project-select-wrap">
            <i class="fa-solid fa-magnifying-glass invoice-search-icon"></i>
            <select class="invoice-project-select" id="invoiceProjectSelect" onchange="selectInvoiceProject(this.value)">
                <option value="">Select a Contracted Project</option>
                <option value="gomti">Gomti Nagar Villa Construction - Client: Zenith Corp.</option>
                <option value="aligani" selected>Aliganj Commercial Complex - Client: Zenith Corp.</option>
                <option value="3bhk">3BHK Apartment - Sector 15 - Client: Kapadia</option>
            </select>
            <i class="fa-solid fa-chevron-down invoice-project-arrow"></i>
        </div>

        <div class="invoice-client-card">
            <img class="invoice-client-avatar" src="https://i.pravatar.cc/100?img=12" alt="Contractor">
            <div>
                <h3 id="invoiceClientTitle">Aliganj Commercial Complex - Client: Zenith Corp.</h3>
                <p id="invoiceClientName">Client: Zenith Corp.</p>
                <p id="invoiceClientAddress">Client address: Aliganj Nagar, India</p>
            </div>
        </div>

    </div>

    <div class="invoice-workspace">

        <div class="invoice-top-sections">

            <section class="invoice-section">
                <h2 class="invoice-section-title">
                    <span class="invoice-step">1</span> Invoice Information
                </h2>

                <div class="invoice-fields">
                    <div class="invoice-field">
                        <label>Invoice Number</label>
                        <input id="invoiceNumber" value="INV-2026-010">
                    </div>

                    <div class="invoice-field">
                        <label>Invoice Date</label>
                        <input id="invoiceDate" type="date" value="${new Date().toISOString().slice(0,10)}">
                    </div>

                    <div class="invoice-field">
                        <label>Due Date</label>
                        <input id="invoiceDueDate" type="date" value="${new Date(Date.now()+7*86400000).toISOString().slice(0,10)}">
                    </div>
                </div>
            </section>

            <section class="invoice-section">
                <h2 class="invoice-section-title">
                    <span class="invoice-step">2</span> Project & Client Summary
                </h2>

                <div class="invoice-summary-list">
                    <div>Client name: <strong id="summaryClient">Mrs. Zenith Corp.</strong></div>
                    <div>Client address: <strong id="summaryAddress">Aliganj Nagar, Lucknow, India-330</strong></div>
                    <div>Project location: <strong id="summaryLocation">Lucknow, India</strong></div>
                </div>
            </section>

        </div>

        <div class="invoice-bottom-sections">

            <section class="invoice-billing">
                <h2 class="invoice-section-title">
                    <span class="invoice-step">3</span> Billing Details
                </h2>

                <div class="invoice-table-wrap">
                    <table class="invoice-table">
                        <thead>
                            <tr>
                                <th>Line No.</th>
                                <th>Description of Work/Materials</th>
                                <th>HSN/SAC Code</th>
                                <th>Quantity</th>
                                <th>Unit Price (₹)</th>
                            </tr>
                        </thead>
                        <tbody id="invoiceItems">
                            ${invoiceLineHTML(1,'Progress Billing: Foundation Complete','SAC: 995411','1','150000')}
                            ${invoiceLineHTML(2,'Material Purchase: Cement Bags (100 bags)','HSN: 2523','100','45000')}
                            ${invoiceLineHTML(3,'Labor: Electrical Installation - Phase 1','SAC: 995461','4 Days','14000')}
                            ${invoiceLineHTML(4,'Add Item','SAC: 995461','3500','25000')}
                        </tbody>
                    </table>
                </div>

                <button class="invoice-add-item" onclick="addInvoiceLineItem()">
                    <i class="fa-solid fa-plus"></i> Add Line Item
                </button>
            </section>

            <aside class="invoice-side">

                <section class="invoice-summary-section">
                    <h2 class="invoice-section-title">
                        <span class="invoice-step">4</span> Summary & Calculations
                    </h2>

                    <div class="invoice-summary-list">
                        <div class="invoice-summary-row">
                            <span>Subtotal:</span><strong id="invoiceSubtotal">₹2,09,000</strong>
                        </div>
                        <div class="invoice-summary-row">
                            <span>CGST (9%):</span><span id="invoiceCgst">₹18,810</span>
                        </div>
                        <div class="invoice-summary-row">
                            <span>SGST (9%):</span><span id="invoiceSgst">₹18,810</span>
                        </div>
                        <div class="invoice-summary-row">
                            <span>Total Tax:</span><span id="invoiceTax">₹37,620</span>
                        </div>
                        <div class="invoice-summary-row total">
                            <span>Grand Total:</span><strong id="invoiceGrandTotal">₹2,46,620</strong>
                        </div>
                    </div>
                </section>

                <section class="invoice-summary-section">
                    <h2 class="invoice-section-title">
                        <span class="invoice-step">5</span> Payment Terms & Notes
                    </h2>
                    <textarea class="invoice-notes" id="invoiceNotes" placeholder="Payment Terms & Notes for client"></textarea>
                </section>

                <section>
                    <h2 class="invoice-section-title">
                        <span class="invoice-step">6</span> Supporting Documents
                    </h2>
                    <label class="invoice-upload">
                        <input type="file" id="invoiceDocuments" multiple hidden onchange="showToast(this.files.length + ' document(s) selected')">
                        <span><i class="fa-solid fa-upload"></i>&nbsp; Upload Documents</span>
                    </label>
                </section>

            </aside>
        </div>

        <div class="invoice-footer">
            <button onclick="saveInvoiceDraft()">Save Draft</button>
            <button onclick="previewInvoice()">Preview Invoice</button>
            <button class="invoice-primary" onclick="generateInvoice()">Generate Invoice & Send to Client</button>
        </div>

    </div>
</div>
`;
}

function invoiceLineHTML(no,description,code,qty,price){
return `
<tr>
    <td class="line-no">${no}</td>
    <td><input class="invoice-desc" value="${description}"></td>
    <td><input class="invoice-code" value="${code}"></td>
    <td><input class="invoice-qty" value="${qty}" oninput="calculateInvoiceTotal()"></td>
    <td><input class="invoice-price" value="${price}" oninput="calculateInvoiceTotal()"></td>
</tr>`;
}

function selectInvoiceProject(project){
    const data={
        gomti:{
            title:'Gomti Nagar Villa Construction - Client: Zenith Corp.',
            client:'Zenith Corp.',
            address:'Gomti Nagar, Lucknow, India',
            summary:'Zenith Corp.',
            summaryAddress:'Gomti Nagar, Lucknow, India-226010'
        },
        aligani:{
            title:'Aliganj Commercial Complex - Client: Zenith Corp.',
            client:'Zenith Corp.',
            address:'Aliganj Nagar, India',
            summary:'Mrs. Zenith Corp.',
            summaryAddress:'Aliganj Nagar, Lucknow, India-330'
        },
        '3bhk':{
            title:'3BHK Apartment - Sector 15 - Client: Kapadia',
            client:'Mrs. Kapadia',
            address:'Sector 15, Noida, India',
            summary:'Mrs. Kapadia',
            summaryAddress:'Sector 15, Noida, India-201301'
        }
    };
    const d=data[project];
    if(!d) return;
    document.getElementById('invoiceClientTitle').textContent=d.title;
    document.getElementById('invoiceClientName').textContent='Client: '+d.client;
    document.getElementById('invoiceClientAddress').textContent='Client address: '+d.address;
    document.getElementById('summaryClient').textContent=d.summary;
    document.getElementById('summaryAddress').textContent=d.summaryAddress;
    document.getElementById('summaryLocation').textContent=d.address.replace(', India','')+', India';
}

function addInvoiceLineItem(){
    const tbody=document.getElementById('invoiceItems');
    const no=tbody.children.length+1;
    tbody.insertAdjacentHTML('beforeend',invoiceLineHTML(no,'New Work / Material','SAC: 995461','1','0'));
    const row=tbody.lastElementChild;
    row.querySelector('.invoice-desc').focus();
}

function calculateInvoiceTotal(){
    let subtotal=0;
    document.querySelectorAll('#invoiceItems tr').forEach(row=>{
        const price=parseFloat((row.querySelector('.invoice-price')?.value||'').replace(/,/g,''))||0;
        const qtyRaw=(row.querySelector('.invoice-qty')?.value||'1').replace(/,/g,'');
        const qty=parseFloat(qtyRaw)||1;
        subtotal += price * qty;
    });
    const cgst=subtotal*0.09;
    const sgst=subtotal*0.09;
    const tax=cgst+sgst;
    const grand=subtotal+tax;
    const money=n=>'₹'+Math.round(n).toLocaleString('en-IN');
    document.getElementById('invoiceSubtotal').textContent=money(subtotal);
    document.getElementById('invoiceCgst').textContent=money(cgst);
    document.getElementById('invoiceSgst').textContent=money(sgst);
    document.getElementById('invoiceTax').textContent=money(tax);
    document.getElementById('invoiceGrandTotal').textContent=money(grand);
}

function saveInvoiceDraft(){
    showToast('Invoice draft saved successfully');
}

function previewInvoice(){
    showToast('Invoice preview opened');
}

function generateInvoice(){
    const total=document.getElementById('invoiceGrandTotal')?.textContent||'';
    showToast('Invoice generated and ready to send • '+total);
}

/* =====================================================
   BIDS PAGE
===================================================== */

function bidsHTML(){
return `
<style>
.bid-page-wrap{padding:8px 0 30px}
.bid-summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:20px}
.bid-summary-card{background:#fff;border:1px solid #e6ebf2;border-radius:14px;padding:18px 20px;min-height:128px;box-shadow:0 3px 12px rgba(18,43,75,.05);position:relative;overflow:hidden}
.bid-summary-top{display:flex;align-items:center;gap:12px}
.bid-summary-icon{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:19px;flex:none}
.bid-blue{background:#1769e8}.bid-orange{background:#f49a16}.bid-green{background:#20a565}.bid-purple{background:#7651c9}.bid-cyan{background:#1aa6bf}
.bid-summary-name{font-size:14px;color:#202833;font-weight:600}.bid-summary-number{font-size:25px;font-weight:800;margin-top:4px;color:#111827}
.bid-summary-link{display:inline-block;margin-top:18px;color:#123c84;font-size:13px;font-weight:700;cursor:pointer}
.bid-summary-link i{margin-left:6px}
.bid-manage{background:#fff;border:1px solid #e4e9f0;border-radius:14px;box-shadow:0 3px 12px rgba(18,43,75,.05);overflow:hidden}
.bid-manage-head{padding:20px 22px 0;display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
.bid-manage-title{font-size:24px;font-weight:800;color:#151b24;margin:0}
.bid-tools{display:flex;gap:12px;align-items:center}
.bid-search{width:290px;height:40px;border:1px solid #d6dde7;border-radius:9px;padding:0 14px 0 38px;font-size:13px;outline:none;background:#fff}
.bid-search-wrap{position:relative}.bid-search-wrap i{position:absolute;left:14px;top:13px;color:#7b8797}
.bid-filter{height:40px;min-width:220px;border:1px solid #d6dde7;border-radius:9px;background:#fff;padding:0 13px;font-size:13px;color:#303946}
.bid-tabs{display:flex;gap:32px;padding:18px 22px 0;border-bottom:1px solid #e3e8ef;margin-top:8px}
.bid-tab{padding:0 2px 14px;font-size:14px;font-weight:600;color:#1e2631;cursor:pointer;border-bottom:3px solid transparent}
.bid-tab.active{color:#0b5bd3;border-bottom-color:#1769e8}
.bid-table{width:100%;border-collapse:collapse;table-layout:fixed}
.bid-table th{background:#f7f9fc;color:#1e2631;text-align:left;font-size:13px;padding:15px 22px;border-bottom:1px solid #e0e5ec;font-weight:700}
.bid-table td{padding:16px 22px;border-bottom:1px solid #edf0f4;font-size:13px;color:#1d2530;vertical-align:middle}
.bid-project-title{font-size:15px;font-weight:700;color:#171d26;margin-bottom:5px}.bid-project-sub{font-size:12px;color:#303946}
.bid-status{display:inline-flex;padding:6px 11px;border-radius:6px;font-size:12px;font-weight:700}.bid-review{background:#fff0c9;color:#795b0b}.bid-won{background:#dff4e5;color:#18733c}.bid-lost{background:#ffe0e0;color:#b42323}
.bid-action{border:1px solid #3985df;color:#075dcc;background:#fff;border-radius:6px;padding:8px 13px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap}
.bid-more{width:34px;height:34px;border:1px solid #dce2e9;background:#fff;border-radius:7px;cursor:pointer;font-size:17px}
.bid-bottom-banner{margin-top:14px;background:#edf4ff;border-radius:12px;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:20px}
.bid-banner-left{display:flex;align-items:center;gap:18px}.bid-banner-icon{width:52px;height:52px;border-radius:8px;background:#0c63cf;color:#fff;display:flex;align-items:center;justify-content:center;font-size:27px}.bid-banner-title{font-size:16px;font-weight:800;color:#102d66}.bid-banner-text{font-size:12px;color:#38506e;margin-top:4px}
.bid-upgrade{background:#092d70;color:#fff;border:0;border-radius:7px;padding:12px 22px;font-weight:700;cursor:pointer}
@media(max-width:1100px){.bid-summary-grid{grid-template-columns:repeat(2,1fr)}.bid-manage-head{flex-direction:column}.bid-tools{width:100%}.bid-search{width:100%}.bid-filter{flex:1}}
@media(max-width:760px){.bid-summary-grid{grid-template-columns:1fr}.bid-tools{flex-direction:column}.bid-search,.bid-filter{width:100%}.bid-table{min-width:850px}.bid-manage{overflow-x:auto}.bid-tabs{min-width:600px}.bid-bottom-banner{align-items:flex-start;flex-direction:column}.bid-upgrade{width:100%}}

/* ===== Professional Micro-Interactions ===== */
.bid-summary-card, .bid-bottom-banner, .bid-action, .bid-more, .bid-upgrade, .bid-summary-link, .bid-tab, .bid-search, .bid-filter {
    transition: transform .18s cubic-bezier(.2,.7,.2,1), box-shadow .18s ease, background-color .18s ease, border-color .18s ease, color .18s ease;
}
.bid-summary-card {
    animation: bidCardIn .42s ease both;
}
.bid-summary-card:nth-child(2){animation-delay:.05s}
.bid-summary-card:nth-child(3){animation-delay:.10s}
.bid-summary-card:nth-child(4){animation-delay:.15s}
@keyframes bidCardIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.bid-summary-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 22px rgba(18,43,75,.09);
    border-color: #c8d8ec;
}
.bid-summary-card:hover .bid-summary-icon { transform: scale(1.06); }
.bid-summary-icon { transition: transform .2s ease; }
.bid-summary-card:active { transform: translateY(0) scale(.992); }
.bid-summary-link:hover { color:#075dcc; transform: translateX(3px); }
.bid-summary-link:active { transform: translateX(1px); }
.bid-search:focus {
    border-color:#5f96d9;
    box-shadow:0 0 0 3px rgba(23,105,232,.09);
}
.bid-filter:focus {
    outline:none;
    border-color:#5f96d9;
    box-shadow:0 0 0 3px rgba(23,105,232,.09);
}
.bid-data-row { transition: background-color .16s ease; }
.bid-data-row:hover { background:#f8fbff; }
.bid-data-row:hover .bid-project-title { color:#075dcc; }
.bid-project-title { transition:color .16s ease; }
.bid-action:hover {
    transform: translateY(-1px);
    background:#f5f9ff;
    border-color:#1971d5;
    box-shadow:0 4px 10px rgba(7,93,204,.11);
}
.bid-action:active, .bid-more:active, .bid-upgrade:active { transform: scale(.97); }
.bid-more:hover {
    border-color:#a9c5e6;
    background:#f7faff;
    box-shadow:0 3px 9px rgba(18,43,75,.09);
}
.bid-upgrade:hover {
    transform: translateY(-1px);
    background:#123f8d;
    box-shadow:0 5px 14px rgba(9,45,112,.18);
}
.bid-bottom-banner:hover {
    box-shadow:0 6px 18px rgba(18,43,75,.07);
}
.bid-tab { position:relative; }
.bid-tab:hover { color:#075dcc; }
.bid-tab:active { transform:scale(.98); }
@media (hover:none) {
    .bid-summary-card:hover, .bid-action:hover, .bid-more:hover, .bid-upgrade:hover { transform:none; }
    .bid-summary-card:active { transform:scale(.988); box-shadow:0 5px 14px rgba(18,43,75,.10); }
    .bid-action:active, .bid-more:active, .bid-upgrade:active { transform:scale(.95); }
    .bid-data-row:active { background:#f5f9ff; }
}
@media (prefers-reduced-motion:reduce) {
    .bid-summary-card, .bid-summary-card:hover, .bid-summary-icon, .bid-action, .bid-more, .bid-upgrade, .bid-summary-link, .bid-tab { animation:none; transition:none; transform:none; }
}

/* =====================================================
   CUSTOMER REQUIREMENTS — CONTRACTOR VIEW
===================================================== */
.customer-req-page{max-width:1500px}
.customer-req-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:18px}
.customer-req-head h1{font-size:24px;color:#13213e;margin-bottom:6px}
.customer-req-head p{color:#718096;font-size:12px}
.customer-req-refresh{height:38px;padding:0 15px;border:1px solid #dbe3ef;background:#fff;border-radius:7px;color:#175fc6;font-weight:700;font-size:11px}
.customer-req-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:16px}
.customer-req-stat{background:#fff;border:1px solid #e5eaf1;border-radius:9px;padding:15px 17px;box-shadow:0 2px 7px rgba(18,37,63,.025)}
.customer-req-stat span{display:block;color:#718096;font-size:10px;margin-bottom:6px}
.customer-req-stat strong{font-size:20px;color:#13213e}
.customer-req-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;background:#fff;border:1px solid #e5eaf1;padding:12px;border-radius:9px;margin-bottom:14px}
.customer-req-search{flex:1;position:relative;max-width:460px}
.customer-req-search i{position:absolute;left:12px;top:11px;color:#8793a6;font-size:12px}
.customer-req-search input{width:100%;height:34px;border:1px solid #dfe5ee;border-radius:6px;padding:0 12px 0 34px;font-size:11px;outline:none}
.customer-req-filters{display:flex;gap:7px;flex-wrap:wrap}
.customer-req-filter{border:1px solid #dfe5ee;background:#fff;border-radius:6px;padding:8px 11px;font-size:10px;color:#536176;font-weight:600;cursor:pointer}
.customer-req-filter.active{background:#eaf2ff;border-color:#b9d2fa;color:#1458c4}
.customer-req-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.customer-request-card{background:#fff;border:1px solid #e3e8f0;border-radius:10px;padding:17px;box-shadow:0 2px 8px rgba(18,37,63,.025);transition:.2s}
.customer-request-card:hover{transform:translateY(-1px);box-shadow:0 5px 16px rgba(18,37,63,.07)}
.customer-request-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.customer-request-top h3{font-size:14px;color:#16243f;margin-bottom:5px}
.customer-request-customer{font-size:10px;color:#748198}
.customer-request-status{padding:5px 9px;border-radius:20px;background:#eaf8ef;color:#16844a;font-size:9px;font-weight:800;text-transform:capitalize;white-space:nowrap}
.customer-request-meta{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:14px 0;padding:12px;background:#f7f9fc;border-radius:7px}
.customer-request-meta div span{display:block;color:#8a95a8;font-size:9px;margin-bottom:3px}.customer-request-meta div strong{font-size:10px;color:#26344d}
.customer-request-details{font-size:10px;line-height:1.55;color:#5e6b80;min-height:31px;margin-bottom:14px}
.customer-request-actions{display:flex;gap:8px;border-top:1px solid #edf0f5;padding-top:12px}
.customer-request-actions button{height:32px;border-radius:6px;padding:0 12px;font-size:10px;font-weight:700;cursor:pointer}
.customer-view-btn{background:#fff;border:1px solid #cfd9e7;color:#315170}.customer-bid-btn{background:#155fc8;border:1px solid #155fc8;color:#fff}
.customer-empty-state{background:#fff;border:1px dashed #cbd5e1;border-radius:10px;padding:45px 20px;text-align:center;color:#718096}.customer-empty-state i{font-size:30px;color:#9aabc0;margin-bottom:12px}.customer-empty-state h3{font-size:14px;color:#334155;margin-bottom:5px}.customer-empty-state p{font-size:10px}
.customer-req-detail{max-width:720px}.customer-req-detail .detail-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:15px 0}.customer-req-detail .detail-box{background:#f7f9fc;border-radius:7px;padding:11px}.customer-req-detail .detail-box small{display:block;color:#8793a6;font-size:9px;margin-bottom:4px}.customer-req-detail .detail-box strong{font-size:11px;color:#24324b}.customer-req-detail .detail-description{background:#f7f9fc;padding:13px;border-radius:7px;color:#536176;font-size:11px;line-height:1.6}
@media(max-width:900px){.customer-req-stats{grid-template-columns:repeat(2,1fr)}.customer-req-grid{grid-template-columns:1fr}}
@media(max-width:600px){.customer-req-head,.customer-req-toolbar{align-items:stretch;flex-direction:column}.customer-req-search{max-width:none}.customer-req-stats{grid-template-columns:1fr 1fr}.customer-request-meta,.customer-req-detail .detail-grid{grid-template-columns:1fr}}
</style>

<div class="bid-page-wrap">

    <div class="bid-summary-grid">
        <div class="bid-summary-card">
            <div class="bid-summary-top">
                <div class="bid-summary-icon bid-orange"><i class="fa-solid fa-handshake"></i></div>
                <div><div class="bid-summary-name">Total Bids Won</div><div class="bid-summary-number">3</div></div>
            </div>
            <span class="bid-summary-link" onclick="switchBidTab('won')">View Bids Won <i class="fa-solid fa-arrow-right"></i></span>
        </div>

        <div class="bid-summary-card">
            <div class="bid-summary-top">
                <div class="bid-summary-icon bid-blue"><i class="fa-solid fa-hourglass-half"></i></div>
                <div><div class="bid-summary-name">Under Review Bids</div><div class="bid-summary-number">4</div></div>
            </div>
            <span class="bid-summary-link" onclick="switchBidTab('review')">View Under Review <i class="fa-solid fa-arrow-right"></i></span>
        </div>

        <div class="bid-summary-card">
            <div class="bid-summary-top">
                <div class="bid-summary-icon bid-green"><i class="fa-solid fa-chart-column"></i></div>
                <div><div class="bid-summary-name">Win Rate (%)</div><div class="bid-summary-number">12%</div></div>
            </div>
            <span class="bid-summary-link" onclick="showToast('Win rate details opened')">View rate <i class="fa-solid fa-arrow-right"></i></span>
        </div>

        <div class="bid-summary-card">
            <div class="bid-summary-top">
                <div class="bid-summary-icon bid-cyan"><i class="fa-solid fa-indian-rupee-sign"></i></div>
                <div><div class="bid-summary-name">Average Bid Amount</div><div class="bid-summary-number">₹18,00,000</div></div>
            </div>
            <span class="bid-summary-link" onclick="showToast('Average bid details opened')">View details <i class="fa-solid fa-arrow-right"></i></span>
        </div>
    </div>

    <div class="bid-manage">
        <div class="bid-manage-head">
            <h1 class="bid-manage-title">Manage My Bids</h1>
            <div class="bid-tools">
                <div class="bid-search-wrap">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <input id="bidSearchInput" class="bid-search" type="text" placeholder="Search customer requests..." oninput="filterBidRows(this.value)">
                </div>
                <select class="bid-filter" onchange="filterBidRows(document.getElementById('bidSearchInput').value)">
                    <option>Filter, date, amount, location</option>
                    <option>Latest submitted</option>
                    <option>Highest bid amount</option>
                    <option>Lucknow</option>
                </select>
            </div>
        </div>

        <div class="bid-tabs">
            <div class="bid-tab active" data-bid-tab="all" onclick="switchBidTab('all',this)">All Bids</div>
            <div class="bid-tab" data-bid-tab="review" onclick="switchBidTab('review',this)">Under Review Bids</div>
            <div class="bid-tab" data-bid-tab="won" onclick="switchBidTab('won',this)">Won Bids</div>
            <div class="bid-tab" data-bid-tab="lost" onclick="switchBidTab('lost',this)">Lost Bids</div>
        </div>

        <table class="bid-table">
            <thead>
                <tr>
                    <th style="width:28%">Project Title</th>
                    <th style="width:17%">Customer</th>
                    <th style="width:13%">Bid Amount (₹)</th>
                    <th style="width:14%">Submitted Date</th>
                    <th style="width:13%">Status</th>
                    <th style="width:15%">Actions</th>
                </tr>
            </thead>
            <tbody id="bidRows">
                ${bidTableRow('3BHK Residential House','Gomti Nagar, Lucknow','Mrs. Kapadia','₹18 Lakh','12 May 2025','review')}
                ${bidTableRow('Commercial Office Space','Hazratganj','TechSolutions','₹1.2 Cr','10 May 2025','review')}
                ${bidTableRow('Warehouse Construction','Sitapur Road','Fresh Logistics','₹35 Lakh','08 May 2025','review')}
                ${bidTableRow('Interior Work','Aliganj','Rahul Verma','₹8 Lakh','05 May 2025','review')}
                ${bidTableRow('2BHK Renovation','Winsome Homes','Winsome Homes','₹10 Lakh','01 May 2025','won')}
                ${bidTableRow('1BHK Apartment','Gupta Associates','Gupta Associates','₹5 Lakh','28 April 2025','lost')}
            </tbody>
        </table>
    </div>

    <div class="bid-bottom-banner">
        <div class="bid-banner-left">
            <div class="bid-banner-icon"><i class="fa-solid fa-file-circle-check"></i></div>
            <div><div class="bid-banner-title">Get More Projects & Grow Your Business</div><div class="bid-banner-text">Upgrade to Premium to get more leads, higher visibility and priority support.</div></div>
        </div>
        <button class="bid-upgrade" onclick="showToast('Premium upgrade opened')"><i class="fa-solid fa-crown"></i>&nbsp; Upgrade Now</button>
    </div>

</div>
`;
}

function bidTableRow(project,location,customer,amount,date,status){
    const statusText = status==='review' ? 'Under Review' : (status==='won' ? 'Won' : 'Lost');
    const statusClass = status==='review' ? 'bid-review' : (status==='won' ? 'bid-won' : 'bid-lost');
    const action = status==='review' ? `<button class="bid-action" onclick="showToast('Bid resubmission opened')"><i class="fa-regular fa-paper-plane"></i>&nbsp; Resubmit Bid</button>` : '-';
    return `<tr class="bid-data-row" data-status="${status}" data-search="${project} ${location} ${customer} ${amount}">
        <td><div class="bid-project-title">${project}</div><div class="bid-project-sub">${location}</div></td>
        <td>${customer}</td><td>${amount}</td><td>${date}</td>
        <td><span class="bid-status ${statusClass}">${statusText}</span></td>
        <td style="display:flex;align-items:center;gap:10px">${action}<button class="bid-more" onclick="showToast('More bid actions opened')">•••</button></td>
    </tr>`;
}

function switchBidTab(tab,element){
    document.querySelectorAll('.bid-tab').forEach(t=>t.classList.remove('active'));
    const target=document.querySelector(`.bid-tab[data-bid-tab="${tab}"]`);
    if(target) target.classList.add('active');
    document.querySelectorAll('.bid-data-row').forEach(row=>{
        row.style.display=(tab==='all'||row.dataset.status===tab)?'':'none';
    });
}

function filterBidRows(value){
    const q=(value||'').toLowerCase().trim();
    const active=document.querySelector('.bid-tab.active');
    const tab=active ? active.dataset.bidTab : 'all';
    document.querySelectorAll('.bid-data-row').forEach(row=>{
        const matchesSearch=!q || row.dataset.search.toLowerCase().includes(q);
        const matchesTab=tab==='all'||row.dataset.status===tab;
        row.style.display=(matchesSearch&&matchesTab)?'':'none';
    });
}



/* =====================================================
   POST INTERNAL REQUIREMENT - SCREENSHOT STYLE
===================================================== */
const requirementTrades = [
    {id:'plumber', icon:'fa-faucet-drip', iconClass:'req-blue', name:'Plumber', sub:'plumbing work, pipe fitting', qty:5, duration:15, rate:1200},
    {id:'electrician', icon:'fa-plug-circle-bolt', iconClass:'req-green', name:'Electrician', sub:'electrical wiring, fitting', qty:3, duration:15, rate:1100},
    {id:'mason', icon:'fa-trowel-bricks', iconClass:'req-orange', name:'Mason', sub:'brick work, plastering', qty:8, duration:30, rate:950},
    {id:'carpenter', icon:'fa-screwdriver-wrench', iconClass:'req-indigo', name:'Carpenter', sub:'shuttering, wood work', qty:4, duration:20, rate:1300},
    {id:'painter', icon:'fa-paint-roller', iconClass:'req-pink', name:'Painter', sub:'wall painting, polish', qty:2, duration:10, rate:900},
    {id:'helper', icon:'fa-person', iconClass:'req-gray', name:'Helper / Labor', sub:'general labor support', qty:6, duration:30, rate:650}
];
function postRequirementHTML(){
    return `<div class="pir-page">
            <div class="pir-breadcrumb">
                <span>Dashboard</span>
                <i>›</i>
                <span>Requirements</span>
                <i>›</i>
                <b>Post Internal Requirement</b>
            </div>

            <div class="pir-header">
                <div>
                    <h1>Post Internal Requirement</h1>
                    <p>B2B Bulk Hiring & Sub-contracting for Cooperative Building Teams</p>
                </div>
                <div>
                    <button class="pir-btn secondary" type="button" onclick="resetForm()">Reset</button>
                </div>
            </div>

            <div class="pir-layout">
                <!-- LEFT: WIZARD FLOW -->
                <div class="pir-main">
                    <!-- PROGRESS STEPPER (5 STEPS) -->
                    <div class="pir-card pir-progress-card">
                        <div class="pir-progress">
                            <button type="button" class="pir-step active" data-step="1" onclick="goToStep(1)">
                                <span>1</span>
                                <b>Project Details</b>
                            </button>
                            <button type="button" class="pir-step" data-step="2" onclick="goToStep(2)">
                                <span>2</span>
                                <b>Trades & Skills</b>
                            </button>
                            <button type="button" class="pir-step" data-step="3" onclick="goToStep(3)">
                                <span>3</span>
                                <b>Configuration</b>
                            </button>
                            <button type="button" class="pir-step" data-step="4" onclick="goToStep(4)">
                                <span>4</span>
                                <b>Logistics</b>
                            </button>
                            <button type="button" class="pir-step" data-step="5" onclick="goToStep(5)">
                                <span>5</span>
                                <b>Review & Post</b>
                            </button>
                        </div>
                    </div>

                    <!-- STEP 1: PROJECT DETAILS -->
                    <section class="pir-card pir-pane active" id="pane-1">
                        <div class="pir-title">
                            <span>1</span>
                            <div>
                                <h2>Step 1: Project Details</h2>
                                <p>Captures basic information of the deployment site</p>
                            </div>
                        </div>

                        <div class="pir-grid">
                            <label>
                                Project Name *
                                <input type="text" id="p_name" value="Green Valley Residency" placeholder="e.g., Green Valley Residency" oninput="syncSummary()">
                            </label>
                            <label>
                                Project Type *
                                <select id="p_type" onchange="syncSummary()">
                                    <option value="Residential" selected>Residential</option>
                                    <option value="Commercial">Commercial</option>
                                    <option value="Industrial">Industrial</option>
                                    <option value="Infrastructure">Infrastructure</option>
                                </select>
                            </label>

                            <label>
                                Project Location *
                                <input type="text" id="p_loc" value="Indore, Madhya Pradesh" placeholder="City, State" oninput="syncSummary()">
                            </label>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                                <label>
                                    Start Date *
                                    <input type="date" id="p_start" value="2025-06-01" onchange="calculateDuration()">
                                </label>
                                <label>
                                    End Date *
                                    <input type="date" id="p_end" value="2025-06-30" onchange="calculateDuration()">
                                </label>
                            </div>

                            <label class="full">
                                Project Description
                                <textarea id="p_desc" maxlength="500" placeholder="Construction of G+2 Residential Building..." oninput="updateCharCount(this, 'desc-count')">Construction of G+2 Residential Building requiring high-quality plumbing, electrical, and masonry workmanship under standard site safety guidelines.</textarea>
                                <span class="pir-count" id="desc-count">172 / 500 characters</span>
                            </label>

                            <div class="full">
                                <label style="margin-bottom:6px;">Cover Image / Site Photo</label>
                                <div class="pir-image-field">
                                    <img id="cover_preview" src="https://images.unsplash.com/photo-1541888946425-d0fbb186c5f8?w=200&auto=format&fit=crop&q=80" class="pir-image-preview" alt="Cover Preview">
                                    <div>
                                        <input type="file" id="cover_file" accept="image/*" style="display:none" onchange="previewImage(event)">
                                        <button type="button" class="pir-btn secondary" onclick="document.getElementById('cover_file').click()">Change Image</button>
                                        <small style="display:block; margin-top:4px; color:#64748b;">JPEG, PNG up to 5MB</small>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="pir-nav">
                            <span>Step 1 of 5</span>
                            <button type="button" class="pir-btn primary" onclick="nextStep(1)">Next: Select Trades ›</button>
                        </div>
                    </section>

                    <!-- STEP 2: SELECT TRADES & SKILLS -->
                    <section class="pir-card pir-pane" id="pane-2">
                        <div class="pir-title">
                            <span>2</span>
                            <div>
                                <h2>Step 2: Select Trades & Skills</h2>
                                <p>Select all worker categories required for this requirement</p>
                            </div>
                        </div>

                        <div class="pir-trade-grid" id="trade-checkboxes">
                            <label class="pir-trade selected">
                                <input type="checkbox" value="Plumber" checked onchange="toggleTradeCard(this)">
                                <div class="pir-trade-icon">🚰</div>
                                <div>
                                    <b>Plumber</b>
                                    <small>Pipe fitting, drainage & sanitation</small>
                                </div>
                            </label>

                            <label class="pir-trade">
                                <input type="checkbox" value="Electrician" onchange="toggleTradeCard(this)">
                                <div class="pir-trade-icon">⚡</div>
                                <div>
                                    <b>Electrician</b>
                                    <small>Concealed wiring, MCB & fittings</small>
                                </div>
                            </label>

                            <label class="pir-trade selected">
                                <input type="checkbox" value="Mason" checked onchange="toggleTradeCard(this)">
                                <div class="pir-trade-icon">🧱</div>
                                <div>
                                    <b>Mason</b>
                                    <small>Brickwork, plastering & PCC</small>
                                </div>
                            </label>

                            <label class="pir-trade">
                                <input type="checkbox" value="Carpenter" onchange="toggleTradeCard(this)">
                                <div class="pir-trade-icon">🔨</div>
                                <div>
                                    <b>Carpenter</b>
                                    <small>Formwork, shuttering & doors</small>
                                </div>
                            </label>

                            <label class="pir-trade">
                                <input type="checkbox" value="Painter" onchange="toggleTradeCard(this)">
                                <div class="pir-trade-icon">🎨</div>
                                <div>
                                    <b>Painter</b>
                                    <small>Putty, primer, interior/exterior</small>
                                </div>
                            </label>

                            <label class="pir-trade">
                                <input type="checkbox" value="Helper / Labor" onchange="toggleTradeCard(this)">
                                <div class="pir-trade-icon">👷</div>
                                <div>
                                    <b>Helper / Labor</b>
                                    <small>Material shifting, mixing, site help</small>
                                </div>
                            </label>
                        </div>

                        <div class="pir-custom">
                            <b style="font-size:11px; color:#1e293b;">Need a trade not listed above?</b>
                            <div class="pir-custom-row">
                                <input type="text" id="custom_trade_input" placeholder="e.g., Welder / Steel Fixer">
                                <button type="button" class="pir-btn secondary" onclick="addCustomTrade()">+ Add Custom Trade</button>
                            </div>
                        </div>

                        <div class="pir-nav">
                            <button type="button" class="pir-btn secondary" onclick="prevStep(2)">‹ Back</button>
                            <span>Step 2 of 5</span>
                            <button type="button" class="pir-btn primary" onclick="nextStep(2)">Next: Configure Team & Rates ›</button>
                        </div>
                    </section>

                    <!-- STEP 3: TEAM CONFIGURATION & RATES -->
                    <section class="pir-card pir-pane" id="pane-3">
                        <div class="pir-title">
                            <span>3</span>
                            <div>
                                <h2>Step 3: Team Configuration & Rates</h2>
                                <p>Set headcount, duration, rate type and offer rates per trade</p>
                            </div>
                        </div>

                        <div class="pir-table-wrap">
                            <table class="pir-table">
                                <thead>
                                    <tr>
                                        <th>Trade / Skill</th>
                                        <th>Team Required</th>
                                        <th>Duration</th>
                                        <th>Rate Type</th>
                                        <th>Your Offer (₹)</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody id="config-table-body">
                                    <!-- Dynamic Rows Injected Here -->
                                </tbody>
                            </table>
                        </div>

                        <div id="config-empty-state" class="pir-empty" style="display:none;">
                            No trades selected. Please go back to Step 2 and select at least one trade.
                        </div>

                        <div class="pir-nav">
                            <button type="button" class="pir-btn secondary" onclick="prevStep(3)">‹ Back</button>
                            <span>Step 3 of 5</span>
                            <button type="button" class="pir-btn primary" onclick="nextStep(3)">Next: Logistics & Settings ›</button>
                        </div>
                    </section>

                    <!-- STEP 4: ADDITIONAL SETTINGS & LOGISTICS -->
                    <section class="pir-card pir-pane" id="pane-4">
                        <div class="pir-title">
                            <span>4</span>
                            <div>
                                <h2>Step 4: Additional Settings & Logistics</h2>
                                <p>Define priority, visibility, deployment deadlines, and work guidelines</p>
                            </div>
                        </div>

                        <div class="pir-grid">
                            <label>
                                Priority Level *
                                <select id="s_priority">
                                    <option value="High" selected>🔴 High Priority (Urgent requirement)</option>
                                    <option value="Medium">🟡 Medium Priority (Within 2 weeks)</option>
                                    <option value="Low">🟢 Low Priority (Advance booking)</option>
                                </select>
                            </label>

                            <label>
                                Requirement Type *
                                <select id="s_req_type">
                                    <option value="Internal Cooperative" selected>Internal Cooperative</option>
                                    <option value="Public Bid">Public Bid</option>
                                </select>
                            </label>

                            <label>
                                Visibility *
                                <select id="s_visibility">
                                    <option value="Only Cooperative Members" selected>Only Cooperative Members</option>
                                    <option value="All Verified Tradesmen">All Verified Tradesmen</option>
                                </select>
                            </label>

                            <label>
                                Need By Date *
                                <input type="date" id="s_need_by" value="2025-06-05">
                            </label>

                            <label class="full">
                                Notes / Instructions (0/200 characters)
                                <textarea id="s_notes" maxlength="200" placeholder="Need experienced professionals. Quality work is priority..." oninput="updateCharCount(this, 'notes-count')">Need experienced professionals. Quality work and adherence to safety protocols is priority. Must have own basic toolset.</textarea>
                                <span class="pir-count" id="notes-count">121 / 200 characters</span>
                            </label>
                        </div>

                        <div class="pir-nav">
                            <button type="button" class="pir-btn secondary" onclick="prevStep(4)">‹ Back</button>
                            <span>Step 4 of 5</span>
                            <button type="button" class="pir-btn primary" onclick="nextStep(4)">Next: Review & Post ›</button>
                        </div>
                    </section>

                    <!-- STEP 5: FINAL REVIEW & POST -->
                    <section class="pir-card pir-pane" id="pane-5">
                        <div class="pir-title">
                            <span>5</span>
                            <div>
                                <h2>Step 5: Final Review & Post</h2>
                                <p>Verify all details before submitting to the backend system</p>
                            </div>
                        </div>

                        <div class="pir-review-grid">
                            <div>
                                <small>Project Name</small>
                                <b id="rev_name">Green Valley Residency</b>
                            </div>
                            <div>
                                <small>Project Type & Location</small>
                                <b id="rev_type_loc">Residential | Indore, Madhya Pradesh</b>
                            </div>
                            <div>
                                <small>Timeline</small>
                                <b id="rev_timeline">2025-06-01 to 2025-06-30 (30 Days)</b>
                            </div>
                            <div>
                                <small>Fulfillment Deadline (Need By)</small>
                                <b id="rev_need_by">2025-06-05</b>
                            </div>
                            <div>
                                <small>Priority & Visibility</small>
                                <b id="rev_priority_vis">High | Only Cooperative Members</b>
                            </div>
                            <div>
                                <small>Requirement Type</small>
                                <b id="rev_req_type">Internal Cooperative</b>
                            </div>
                            <div class="full">
                                <small>Instructions</small>
                                <p id="rev_notes" style="font-size:11px; margin:0; color:#334155;">-</p>
                            </div>
                        </div>

                        <div class="pir-review">
                            <h3>Configured Trades & Headcount</h3>
                            <div class="pir-table-wrap">
                                <table class="pir-table">
                                    <thead>
                                        <tr>
                                            <th>Trade</th>
                                            <th>Team Size</th>
                                            <th>Duration</th>
                                            <th>Rate Type</th>
                                            <th>Offer Rate</th>
                                            <th>Estimated Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody id="rev_table_body">
                                        <!-- Review Table Rows -->
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div class="pir-nav" style="margin-top:20px;">
                            <button type="button" class="pir-btn secondary" onclick="prevStep(5)">‹ Back to Edit</button>
                            <div style="display:flex; gap:10px;">
                                <button type="button" class="pir-btn secondary" onclick="saveDraft()">💾 Save as Draft</button>
                                <button type="button" class="pir-btn primary" onclick="submitRequirement()">🚀 Review & Post Requirement</button>
                            </div>
                        </div>
                    </section>
                </div>

                <!-- RIGHT: GLOBAL STICKY ESTIMATOR SIDEBAR -->
                <div class="pir-sidebar">
                    <div class="pir-sticky">
                        <div class="pir-card pir-summary">
                            <div class="pir-summary-head">
                                <h3>Requirement Summary</h3>
                                <span>Live Sync</span>
                            </div>

                            <div class="pir-project" id="side_project_name">Green Valley Residency</div>
                            <div class="pir-location" id="side_location">Indore, Madhya Pradesh</div>

                            <div class="pir-stats">
                                <div>
                                    <b id="side_total_trades">2</b>
                                    <small>Trades</small>
                                </div>
                                <div>
                                    <b id="side_total_team">13</b>
                                    <small>Total Workers</small>
                                </div>
                                <div>
                                    <b id="side_duration">30 Days</b>
                                    <small>Est. Duration</small>
                                </div>
                            </div>

                            <div class="pir-summary-head" style="margin-top:16px;">
                                <h3>Cost Breakdown (Est.)</h3>
                            </div>

                            <div class="pir-cost">
                                <span>Labor Cost (Calc):</span>
                                <b id="side_labor_cost" style="color:#0f172a;">₹4,20,000</b>
                            </div>

                            <div class="pir-cost">
                                <span>Material Cost:</span>
                                <input type="number" id="side_material_cost" value="650000" step="5000" oninput="calculateTotalCost()">
                            </div>

                            <div class="pir-cost pir-cost-total">
                                <span style="font-weight:700; color:#0f172a;">Total Est. Cost:</span>
                                <strong id="side_total_cost">₹12,95,000</strong>
                            </div>
                        </div>

                        <div class="pir-tip">
                            <h4>💡 B2B Cooperative Guidelines</h4>
                            <ol>
                                <li>Offer competitive daily rates to ensure quick fulfillment by cooperative trade masters.</li>
                                <li>Mark urgent requirements as "High Priority" for automated SMS alerts to contractors.</li>
                                <li>Material cost helps the estimator compute comprehensive project budget.</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}

function initPostRequirement(){ }

function bindRequirementCounters(){const d=document.getElementById('postReqDescription'),n=document.getElementById('reqNotes');const update=()=>{if(d){const el=document.getElementById('postReqDescCounter');if(el)el.textContent=`${d.value.length}/1000 characters`;}if(n){const el=document.getElementById('reqNotesCounter');if(el)el.textContent=`${n.value.length}/200 characters`;}};d?.addEventListener('input',update);n?.addEventListener('input',update);update();document.getElementById('postReqProjectName')?.addEventListener('input',()=>{const el=document.getElementById('summaryProjectName');if(el)el.textContent=document.getElementById('postReqProjectName').value||'—';});document.getElementById('postReqLocation')?.addEventListener('input',()=>{const el=document.getElementById('summaryLocation');if(el)el.textContent=document.getElementById('postReqLocation').value||'—';});}
function setRequirementTrade(index,checked){const row=document.querySelector(`tr[data-trade-id="${requirementTrades[index].id}"]`);if(!row)return;const cb=row.querySelector('.req-check');cb.checked=!!checked;row.classList.toggle('selected',cb.checked);updateRequirementSummary();}
function toggleRequirementTrade(index){const row=document.querySelector(`tr[data-trade-id="${requirementTrades[index].id}"]`);if(!row)return;const cb=row.querySelector('.req-check');setRequirementTrade(index,!cb.checked);}
function changeTradeQty(i,delta){const el=document.getElementById('tradeQty'+i);if(!el)return;el.value=Math.max(1,(parseInt(el.value)||1)+delta);updateRequirementSummary();}
function updateRequirementSummary(){let selected=0,team=0,maxDays=0,labor=0;requirementTrades.forEach((t,i)=>{const row=document.querySelector(`tr[data-trade-id="${t.id}"]`),cb=row?.querySelector('.req-check');if(cb?.checked){selected++;const q=Math.max(1,parseInt(document.getElementById('tradeQty'+i)?.value)||1);const dur=parseInt(document.getElementById('tradeDuration'+i)?.value)||t.duration;const rate=parseFloat(document.getElementById('tradeRate'+i)?.value)||0;team+=q;maxDays=Math.max(maxDays,dur);labor+=q*dur*rate;}});const material=parseFloat(document.getElementById('rftMaterialCost')?.value)||0;const other=parseFloat(document.getElementById('rftOtherCost')?.value)||0;const total=labor+material+other;const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};set('summaryTrades',`${selected} Selected`);set('summaryTeam',`${team} Members`);set('summaryDuration',`${maxDays||0} Days`);set('summaryBudget','₹ '+Math.round(labor).toLocaleString('en-IN'));set('costLabor','₹ '+Math.round(labor).toLocaleString('en-IN'));set('rftTotalCost','₹ '+Math.round(total).toLocaleString('en-IN'));}
function addCustomTrade(){const name=prompt('Enter trade / skill name:','Tile Mason');if(!name)return;requirementTrades.push({id:'custom-'+Date.now(),name:name,sub:'Custom specification',qty:1,duration:15,rate:0,icon:'fa-hammer',iconClass:'blue'});initPostRequirement();showToast(`${name} added to the RFT`);}
function changeRequirementImage(){const url=prompt('Paste project image URL:',document.getElementById('postReqProjectImage')?.src||'');if(url&&document.getElementById('postReqProjectImage'))document.getElementById('postReqProjectImage').src=url;}
function uploadRftFile(label){const id=label.includes('Architectural')?'rftFileArchitectural':label.includes('Structural')?'rftFileStructural':label.includes('Bill')?'rftFileBOQ':'rftFileSoil';const input=document.createElement('input');input.type='file';input.accept='.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png';input.onchange=()=>{if(input.files[0])document.getElementById(id).textContent=input.files[0].name;};input.click();}
function saveRequirementDraft(){const data=collectRftData();localStorage.setItem('buildbid_rft_draft',JSON.stringify(data));showToast('RFT saved as draft');}
function collectRftData(){return {projectName:document.getElementById('postReqProjectName')?.value||'',projectType:document.getElementById('postReqProjectType')?.value||'',location:document.getElementById('postReqLocation')?.value||'',startDate:document.getElementById('postReqStart')?.value||'',endDate:document.getElementById('postReqEnd')?.value||'',description:document.getElementById('postReqDescription')?.value||'',criticalFactors:document.getElementById('rftCriticalFactors')?.value||'',phase:document.getElementById('rftPhase')?.value||'',materialCost:Number(document.getElementById('rftMaterialCost')?.value||0),otherCost:Number(document.getElementById('rftOtherCost')?.value||0),requirementType:document.getElementById('reqRequirementType')?.value||'',visibility:document.getElementById('reqVisibility')?.value||'',biddingLanguage:document.getElementById('reqNotes')?.value||'',trades:requirementTrades.map((t,i)=>({id:t.id,name:t.name,selected:!!document.querySelector(`tr[data-trade-id="${t.id}"] .req-check`)?.checked,qty:Number(document.getElementById('tradeQty'+i)?.value||t.qty),duration:document.getElementById('tradeDuration'+i)?.value||`${t.duration} Days`,rate:Number(document.getElementById('tradeRate'+i)?.value||t.rate)}))};}
function previewRequirement(){const d=collectRftData();alert(`RFT Preview\n\nProject: ${d.projectName}\nLocation: ${d.location}\nTrades: ${d.trades.filter(t=>t.selected).length}\nDescription: ${d.description}`);}
function reviewAndPostRequirement(){const d=collectRftData();if(!d.projectName||!d.location){showToast('Please enter project name and location');return;}const posted={...d,id:'RFT-'+Date.now(),status:'Published',createdAt:new Date().toISOString()};const list=JSON.parse(localStorage.getItem('buildbid_rfts')||'[]');list.unshift(posted);localStorage.setItem('buildbid_rfts',JSON.stringify(list));showToast('RFT released successfully');}

/* =====================================================
   HIRE PROFESSIONALS
===================================================== */

const professionalsData = [
 {name:'Priya Sharma',role:'Electrician',hindi:'इलेक्ट्रीशियन',exp:'8+ Years Experience',rate:'₹700/day',rating:'4.8',skill:'Industrial Wiring & Fixtures',img:'https://i.pravatar.cc/120?img=47'},
 {name:'Rohan Gupta',role:'Plumber',hindi:'प्लम्बर',exp:'8+ Years Experience',rate:'₹600/day',rating:'4.8',skill:'Residential Piping & Fittings',img:'https://i.pravatar.cc/120?img=11'},
 {name:'Vikram Singh',role:'General Labour',hindi:'मजदूर',exp:'5+ Years Experience',rate:'₹400/day',rating:'4.5',skill:'Site Help & Cleanup',img:'https://i.pravatar.cc/120?img=12'},
 {name:'Aman Khan',role:'Painter',hindi:'पेंटर',exp:'7+ Years Experience',rate:'₹550/day',rating:'4.7',skill:'Interior & Exterior Painting',img:'https://i.pravatar.cc/120?img=13'},
 {name:'Sarah Jones',role:'Interior Designer',hindi:'इंटीरियर डिजाइनर',exp:'6+ Years Experience',rate:'₹1220/day',rating:'4.9',skill:'Spatial Design & Decor',img:'https://i.pravatar.cc/120?img=32'},
 {name:'Rajesh Kumar',role:'Gardener',hindi:'माली',exp:'1+ Years Experience',rate:'₹450/day',rating:'4.5',skill:'Landscaping & Plant Care',img:'https://i.pravatar.cc/120?img=14'},
 {name:'Mohan Kumar',role:'Electrician',hindi:'इलेक्ट्रीशियन',exp:'10+ Years Experience',rate:'₹700/day',rating:'4.8',skill:'Industrial Wiring & Fixtures',img:'https://i.pravatar.cc/120?img=15'},
 {name:'Suresh Singh',role:'Plumber',hindi:'प्लम्बर',exp:'8+ Years Experience',rate:'₹600/day',rating:'4.6',skill:'Residential Piping & Fittings',img:'https://i.pravatar.cc/120?img=16'},
 {name:'Rahul Raj',role:'General Labour',hindi:'मजदूर',exp:'5+ Years Experience',rate:'₹400/day',rating:'4.5',skill:'Site Help & Cleanup',img:'https://i.pravatar.cc/120?img=17'},
 {name:'Vijay Paul',role:'Painter',hindi:'पेंटर',exp:'7+ Years Experience',rate:'₹550/day',rating:'4.7',skill:'Interior & Exterior Painting',img:'https://i.pravatar.cc/120?img=18'},
 {name:'Shweta Agarwal',role:'Interior Designer',hindi:'इंटीरियर डिजाइनर',exp:'6+ Years Experience',rate:'₹1200/day',rating:'4.9',skill:'Spatial Design & Decor',img:'https://i.pravatar.cc/120?img=44'},
 {name:'Ramu Kaka',role:'Gardener',hindi:'माली',exp:'12+ Years Experience',rate:'₹450/day',rating:'4.5',skill:'Landscaping & Plant Care',img:'https://i.pravatar.cc/120?img=51'},
 {name:'Mohan Kumar',role:'Electrician',hindi:'इलेक्ट्रीशियन',exp:'10+ Years Experience',rate:'₹700/day',rating:'4.8',skill:'Industrial Wiring & Fixtures',img:'https://i.pravatar.cc/120?img=15'},
 {name:'Suresh Singh',role:'Plumber',hindi:'प्लम्बर',exp:'8+ Years Experience',rate:'₹600/day',rating:'4.6',skill:'Residential Piping & Fittings',img:'https://i.pravatar.cc/120?img=16'},
 {name:'Ramu Kaka',role:'Gardener',hindi:'माली',exp:'12+ Years Experience',rate:'₹450/day',rating:'4.5',skill:'Landscaping & Plant Care',img:'https://i.pravatar.cc/120?img=51'},
 {name:'Ajay Vishwakarma',role:'Carpenter',hindi:'बढ़ई',exp:'9+ Years Experience',rate:'₹650/day',rating:'4.6',skill:'Custom Furniture Making',img:'https://i.pravatar.cc/120?img=56'},
 {name:'Balbir Singh',role:'Security Guard',hindi:'सुरक्षा गार्ड',exp:'4+ Years Experience',rate:'₹350/day',rating:'4.4',skill:'Gate & Asset Security',img:'https://i.pravatar.cc/120?img=59'},
 {name:'Manish Kumar',role:'Generator Operator',hindi:'जनरेटर ऑपरेटर',exp:'3+ Years Experience',rate:'₹400/day',rating:'4.3',skill:'Power Equipment Operation',img:'https://i.pravatar.cc/120?img=60'},
 {name:'Moan Khan',role:'General Labour',hindi:'मजदूर',exp:'5+ Years Experience',rate:'₹700/day',rating:'4.8',skill:'Site Help & Cleanup',img:'https://i.pravatar.cc/120?img=68'},
 {name:'Rahul Raj',role:'General Labour',hindi:'मजदूर',exp:'5+ Years Experience',rate:'₹400/day',rating:'4.5',skill:'Site Help & Cleanup',img:'https://i.pravatar.cc/120?img=17'},
 {name:'Aman Khan',role:'General Labour',hindi:'मजदूर',exp:'7+ Years Experience',rate:'₹400/day',rating:'4.5',skill:'Site Help & Cleanup',img:'https://i.pravatar.cc/120?img=13'},
 {name:'Vajaan Paul',role:'Painter',hindi:'पेंटर',exp:'7+ Years Experience',rate:'₹550/day',rating:'4.7',skill:'Interior & Exterior Painting',img:'https://i.pravatar.cc/120?img=18'},
 {name:'Suresh Singh',role:'Plumber',hindi:'प्लम्बर',exp:'8+ Years Experience',rate:'₹600/day',rating:'4.6',skill:'Landscaping & Plant Care',img:'https://i.pravatar.cc/120?img=16'},
 {name:'Manish Kumar',role:'Generator Operator',hindi:'जनरेटर ऑपरेटर',exp:'3+ Years Experience',rate:'₹400/day',rating:'4.3',skill:'Power Equipment Operation',img:'https://i.pravatar.cc/120?img=60'},
 {name:'Priya Sharma',role:'Electrician',hindi:'इलेक्ट्रीशियन',exp:'6+ Years Experience',rate:'₹700/day',rating:'4.8',skill:'Skill Roles',img:'https://i.pravatar.cc/120?img=47'},
 {name:'Rohan Gupta',role:'Plumber',hindi:'प्लम्बर',exp:'8+ Years Experience',rate:'₹800/day',rating:'4.8',skill:'Skill Roles',img:'https://i.pravatar.cc/120?img=11'},
 {name:'Vikram Singh',role:'General Labour',hindi:'मजदूर',exp:'5+ Years Experience',rate:'₹400/day',rating:'4.5',skill:'Skill Roles',img:'https://i.pravatar.cc/120?img=12'},
 {name:'Sarah Jones',role:'Interior Designer',hindi:'इंटीरियर डिजाइनर',exp:'6+ Years Experience',rate:'₹500/day',rating:'4.9',skill:'Skill Roles',img:'https://i.pravatar.cc/120?img=32'},
 {name:'Rajesh Kumar',role:'Gardener',hindi:'माली',exp:'6+ Years Experience',rate:'₹200/day',rating:'4.5',skill:'Skill Roles',img:'https://i.pravatar.cc/120?img=14'},
 {name:'Kevin Lee',role:'General Labour',hindi:'मजदूर',exp:'3+ Years Experience',rate:'₹400/day',rating:'4.3',skill:'Skill Roles',img:'https://i.pravatar.cc/120?img=19'}
];

function professionalsHTML(){
 return `
 <div class="professionals-page">
   <div class="professionals-head">
     <h1>Recommended Professionals</h1>
     <div class="professional-tools">
       <div class="professional-search"><i class="fa-solid fa-magnifying-glass"></i><input id="professionalSearch" placeholder="Search..." oninput="filterProfessionals(this.value)"></div>
       <button class="professional-filter" onclick="showToast('Filters opened')"><i class="fa-solid fa-sliders"></i> Filters <i class="fa-solid fa-chevron-down"></i></button>
       <button class="professional-filter" onclick="showToast('Filter options opened')"><i class="fa-solid fa-filter"></i> Filter <i class="fa-solid fa-chevron-down"></i></button>
     </div>
   </div>
   <div id="professionalsGrid" class="professionals-grid"></div>
 </div>`;
}

function renderProfessionals(items=professionalsData){
 const grid=document.getElementById('professionalsGrid');
 if(!grid)return;
 grid.innerHTML=items.map((p,i)=>`
  <article class="professional-card">
    <div class="professional-top">
      <img src="${p.img}" alt="${p.name}" class="professional-avatar">
      <div class="professional-name-wrap"><h3>${p.name}</h3><strong>${p.role}</strong><span>${p.exp}</span></div>
    </div>
    <div class="professional-meta"><b>${p.rate}</b><span><i class="fa-solid fa-star"></i> ${p.rating} Rating</span></div>
    <div class="professional-skill">${p.skill}</div>
    <button class="hire-professional-btn" onclick="hireProfessional(${i})">Hire Now</button>
  </article>`).join('');
}

function filterProfessionals(value){
 const q=(value||'').toLowerCase().trim();
 const filtered=professionalsData.filter(p=>`${p.name} ${p.role} ${p.hindi} ${p.exp} ${p.skill} ${p.rate}`.toLowerCase().includes(q));
 renderProfessionals(filtered);
}

function hireProfessional(index){
 const p=professionalsData[index];
 if(!p)return;
 showToast(`${p.name} selected for hiring`);
}

/* =====================================================
   CONTRACTS
===================================================== */

function contractsHTML(){
return `
<div id="contractsPageRoot" class="contracts-page-root">
<div class="page-title">
    <div>
        <h1>My Contracts</h1>
        <p>Manage your active, pending and completed contracts.</p>
    </div>
</div>

<div class="contracts-kpis">
    <div class="contracts-kpi">
        <div class="contracts-kpi-top">
            <div class="contracts-kpi-icon"><i class="fa-solid fa-file-contract"></i></div>
            <div><div class="contracts-kpi-label">Active Contracts</div><div class="contracts-kpi-value">18 ↗</div></div>
        </div>
        <span class="contracts-kpi-link" onclick="filterContracts('in-progress')">View contracts →</span>
    </div>
    <div class="contracts-kpi">
        <div class="contracts-kpi-top">
            <div class="contracts-kpi-icon"><i class="fa-solid fa-sack-dollar"></i></div>
            <div><div class="contracts-kpi-label">Total Contract Value</div><div class="contracts-kpi-value">₹1,50,00,000</div></div>
        </div>
        <span class="contracts-kpi-link" onclick="showToast('Contract value details opened')">View details →</span>
    </div>
    <div class="contracts-kpi">
        <div class="contracts-kpi-top">
            <div class="contracts-kpi-icon"><i class="fa-solid fa-file-invoice-dollar"></i></div>
            <div><div class="contracts-kpi-label">Pending Payments</div><div class="contracts-kpi-value">₹15,00,000</div></div>
        </div>
        <span class="contracts-kpi-link" onclick="loadPage('invoice')">View invoices →</span>
    </div>
</div>

<div class="contracts-layout">
    <div>
        <div class="contracts-main-card">
            <div class="contracts-card-head">
                <h2>Active Contracts</h2>
                <span onclick="showToast('Showing all contract projects')">View All Projects →</span>
            </div>
            <div class="contracts-tabs">
                <div class="contracts-tab active" onclick="filterContracts('all',this)">All Contracts</div>
                <div class="contracts-tab" onclick="filterContracts('in-progress',this)">In Progress</div>
                <div class="contracts-tab" onclick="filterContracts('pending',this)">Pending Signature</div>
                <div class="contracts-tab" onclick="filterContracts('completed',this)">Completed</div>
            </div>
            <div id="contractsList"></div>
        </div>

        <div class="grow-banner">
            <div class="grow-left">
                <div class="grow-icon"><i class="fa-solid fa-file-circle-plus"></i></div>
                <div><h3>Get More Projects &amp; Grow Your Business</h3><p>Upgrade to Premium to get more leads, higher visibility and priority support.</p></div>
            </div>
            <button class="grow-btn" onclick="showToast('Premium upgrade selected')"><i class="fa-solid fa-crown"></i> Upgrade Now</button>
        </div>
    </div>

    <div>
        <div class="contracts-side-card">
            <div class="contracts-card-head"><h2>My Performance</h2><span onclick="showToast('Performance details opened')">View All →</span></div>
            <div class="contract-side-body">
                <div class="contract-performance-row"><span><i class="fa-solid fa-eye"></i>&nbsp; Response Rate</span><strong>92%</strong></div>
                <div class="contract-performance-row"><span><i class="fa-solid fa-building"></i>&nbsp; Projects Completed</span><strong>56</strong></div>
                <div class="contract-performance-row"><span><i class="fa-solid fa-clock"></i>&nbsp; On-Time Delivery</span><strong>89%</strong></div>
                <div class="contract-performance-row"><span><i class="fa-solid fa-star"></i>&nbsp; Customer Rating</span><strong>4.6 / 5</strong></div>
            </div>
        </div>

        <div class="contracts-side-card">
            <div class="contracts-card-head"><h2>Recent Notifications</h2><span onclick="loadPage('notifications')">View All →</span></div>
            <div class="contract-notify">
                <div class="contract-notify-item"><div class="contract-notify-icon"><i class="fa-solid fa-eye"></i></div><div class="contract-notify-text">Project Milestone 3 completed for Commercial Building<div class="contract-notify-time">1h ago</div></div></div>
                <div class="contract-notify-item"><div class="contract-notify-icon"><i class="fa-solid fa-file-invoice"></i></div><div class="contract-notify-text">New Invoice sent for 3BHK House for Rahul Verma<div class="contract-notify-time">3h ago</div></div></div>
                <div class="contract-notify-item"><div class="contract-notify-icon"><i class="fa-solid fa-file-invoice"></i></div><div class="contract-notify-text">New Invoice sent for 3BHK House for Warehouse<div class="contract-notify-time">5h ago</div></div></div>
                <div class="contract-notify-item"><div class="contract-notify-icon"><i class="fa-solid fa-file-signature"></i></div><div class="contract-notify-text">Contract signed for Warehouse<div class="contract-notify-time">1d ago</div></div></div>
            </div>
        </div>
    </div>
</div>
</div>
`;
}

const contractData = [
    {id:'CONTRACT-301',name:'3BHK Residential House Construction',loc:'Hazratganj, Lucknow, UP',dates:'Start: 1 June 2025 - Est. End: 31 May 2026',progress:45,status:'in-progress',label:'In Progress',photo:'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80'},
    {id:'CONTRACT-298',name:'3BHK Residential House Construction',loc:'Hazratganj, Lucknow, UP',dates:'Start: 1 June 2025 - Est. End: 31 May 2026',progress:45,status:'in-progress',label:'In Progress',photo:'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=300&q=80'},
    {id:'CONTRACT-294',name:'3BHK Residential House Construction',loc:'Hazratganj, Lucknow, UP',dates:'Start: 1 June 2025 - Est. End: 31 May 2026',progress:45,status:'pending',label:'Pending Signature',photo:'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=300&q=80'},
    {id:'CONTRACT-289',name:'3BHK Residential House Construction',loc:'Hazratganj, Lucknow, UP',dates:'Start: 1 June 2025 - Est. End: 31 May 2026',progress:45,status:'in-progress',label:'In Progress',photo:'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=300&q=80'}
];

function renderContracts(filter='all'){
    const list=document.getElementById('contractsList');
    if(!list) return;
    const rows=filter==='all'?contractData:contractData.filter(c=>c.status===filter);
    if(!rows.length){list.innerHTML='<div class="contract-empty">No contracts found in this category.</div>';return;}
    list.innerHTML=rows.map(c=>`
        <div class="contract-row">
            <img class="contract-photo" src="${c.photo}" alt="${c.name}" title="Open ${c.id}" role="button" tabindex="0" onclick="openContract('${c.id}')" onkeydown="if(event.key==='Enter'||event.key===' ')openContract('${c.id}')">
            <div>
                <div class="contract-id">${c.id}</div>
                <div class="contract-name">${c.name}</div>
                <div class="contract-location">${c.loc}</div>
                <div class="contract-dates">${c.dates}</div>
            </div>
            <div class="contract-progress-wrap">
                <div class="contract-progress-label"><span>${c.progress}% Complete</span><strong>${c.progress}%</strong></div>
                <div class="contract-progress-bar"><div class="contract-progress-fill" style="width:${c.progress}%"></div></div>
            </div>
            <div class="contract-status">
                <span class="status-pill ${c.status==='pending'?'status-processing':'status-delivered'}">${c.label}</span>
            </div>
            <div class="contract-actions">
                <button class="contract-btn" onclick="openContract('${c.id}')">View Contract</button>
                <button class="contract-btn primary" onclick="showToast('Invoices opened for ${c.id}')">Invoices</button>
            </div>
        </div>
    `).join('');
}

function filterContracts(filter='all',el){
    document.querySelectorAll('.contracts-tab').forEach(t=>t.classList.remove('active'));
    if(el) el.classList.add('active');
    else document.querySelector('.contracts-tab')?.classList.add('active');
    renderContracts(filter);
}

function openContract(id){
    const c=contractData.find(x=>x.id===id);
    if(!c) return;
    let modal=document.getElementById('contractDetailModal');
    if(!modal){
        modal=document.createElement('div');
        modal.id='contractDetailModal';
        modal.className='contract-modal-backdrop';
        modal.innerHTML=`
            <div class="contract-modal" role="dialog" aria-modal="true">
                <button class="contract-modal-close" onclick="closeContractModal()" aria-label="Close">&times;</button>
                <img id="contractModalPhoto" class="contract-modal-photo" src="" alt="">
                <div class="contract-modal-content">
                    <div id="contractModalId" class="contract-id"></div>
                    <h2 id="contractModalName"></h2>
                    <p id="contractModalLocation"></p>
                    <p id="contractModalDates"></p>
                    <div class="contract-modal-progress">
                        <div><span>Progress</span><strong id="contractModalProgress"></strong></div>
                        <div class="contract-progress-bar"><div id="contractModalFill" class="contract-progress-fill"></div></div>
                    </div>
                    <div class="contract-modal-actions">
                        <button class="contract-btn primary" onclick="showToast('Contract opened')">Open Contract</button>
                        <button class="contract-btn" onclick="showToast('Invoices opened')">Invoices</button>
                    </div>
                </div>
            </div>`;
        modal.addEventListener('click',e=>{if(e.target===modal) closeContractModal();});
        document.body.appendChild(modal);
    }
    document.getElementById('contractModalPhoto').src=c.photo;
    document.getElementById('contractModalPhoto').alt=c.name;
    document.getElementById('contractModalId').textContent=c.id;
    document.getElementById('contractModalName').textContent=c.name;
    document.getElementById('contractModalLocation').textContent=c.loc;
    document.getElementById('contractModalDates').textContent=c.dates;
    document.getElementById('contractModalProgress').textContent=c.progress+'%';
    document.getElementById('contractModalFill').style.width=c.progress+'%';
    modal.classList.add('show');
}

function closeContractModal(){
    document.getElementById('contractDetailModal')?.classList.remove('show');
}


/* =====================================================
   MATERIALS
===================================================== */

let mrfqStep = 1;
let mrfqMaterials = [
    {item:"",grade:"",brands:[],quantity:"",unit:"",targetPrice:"",quoteFirst:false}
];

const mrfqCategories = [
    {id:"civil",name:"Civil & Structural",desc:"Cement, Steel, Bricks",icon:"fa-building"},
    {id:"finishing",name:"Finishing",desc:"Tiles, Paint",icon:"fa-paint-roller"},
    {id:"mep",name:"MEP",desc:"Plumbing, Electrical, HVAC",icon:"fa-gears"},
    {id:"tools",name:"Tools & Equipment",desc:"Tools & Site Equipment",icon:"fa-screwdriver-wrench"}
];

const mrfqMaterialOptions = {
    civil:["TMT Steel Bar","Portland Pozzolana Cement","OPC Cement","Red Bricks","AAC Blocks","River Sand","M-Sand","Coarse Aggregate"],
    finishing:["Vitrified Tiles","Ceramic Tiles","Wall Paint","Primer","Putty","Marble","Granite","Wood Flooring"],
    mep:["PVC Pipe","CPVC Pipe","GI Pipe","Copper Wire","Electrical Conduit","MCB","LED Lights","HVAC Duct"],
    tools:["Drill Machine","Concrete Mixer","Cutting Machine","Scaffolding","Safety Helmet","Safety Shoes"]
};

const mrfqGrades = {
    "TMT Steel Bar":["Fe-415","Fe-500","Fe-550D"],
    "Portland Pozzolana Cement":["Grade 43","Grade 53"],
    "OPC Cement":["Grade 43","Grade 53"],
    "Red Bricks":["First Class","Second Class"],
    "AAC Blocks":["600x200x100 mm","600x200x150 mm","600x200x200 mm"],
    "Vitrified Tiles":["600x600 mm","800x800 mm","1200x600 mm"],
    "Ceramic Tiles":["300x300 mm","600x600 mm"],
    "Wall Paint":["Interior Emulsion","Exterior Emulsion"],
    "PVC Pipe":["Class 2","Class 3","Class 4"],
    "CPVC Pipe":["SDR 11","SDR 13.5"],
    "Copper Wire":["1.5 sq.mm","2.5 sq.mm","4 sq.mm"],
    "Electrical Conduit":["20 mm","25 mm","32 mm"]
};

function mrfqEsc(v){
    return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function materialsHTML(){
    return `
<div class="material-rfq-page">
  <div class="mrfq-head">
    <div>
      <div class="mrfq-breadcrumb">Dashboard <span>›</span> Order Material</div>
      <h1>Post Material Requirement <span style="font-weight:500;color:#6f7c90">(RFQ)</span></h1>
      <p>Create a bulk material request and invite verified suppliers to quote.</p>
    </div>
    <button class="mrfq-orders-btn" onclick="loadPage('orders')"><i class="fa-solid fa-cart-shopping"></i> My Orders</button>
  </div>

  <div class="mrfq-layout">
    <div class="mrfq-main">
      <div class="mrfq-steps">
        ${[
          ["1","Material Category","Choose category"],
          ["2","Delivery & Site","Where & when"],
          ["3","Materials & Qty","Build bulk order"],
          ["4","Commercials","Terms & vendors"],
          ["5","Review & Post","Publish RFQ"]
        ].map((x,i)=>`<div class="mrfq-step ${mrfqStep===i+1?"active":""} ${mrfqStep>i+1?"done":""}" onclick="mrfqShowStep(${i+1})">
          <div class="mrfq-step-dot">${mrfqStep>i+1?"✓":x[0]}</div>
          <div class="mrfq-step-label">${x[1]}</div><div class="mrfq-step-sub">${x[2]}</div>
        </div>`).join("")}
      </div>

      <div id="mrfqStepContent"></div>

      <div class="mrfq-actions">
        <button class="mrfq-btn back" onclick="mrfqPrev()" ${mrfqStep===1?"style='visibility:hidden'":""}><i class="fa-solid fa-arrow-left"></i> Back</button>
        ${mrfqStep<5
          ? `<button class="mrfq-btn next" onclick="mrfqNext()">Continue <i class="fa-solid fa-arrow-right"></i></button>`
          : `<div style="display:flex;gap:8px;margin-left:auto"><button class="mrfq-btn back" onclick="saveMaterialRFQDraft()">Save as Draft</button><button class="mrfq-btn next publish" onclick="publishMaterialRFQ()">Publish Material Request (RFQ) <i class="fa-solid fa-paper-plane"></i></button></div>`}
      </div>
    </div>

    <aside class="mrfq-sidebar">
      <div class="mrfq-side-card">
        <div class="mrfq-side-head"><h3><i class="fa-solid fa-clipboard-list"></i> Order Summary</h3><p>Updates automatically across all 5 steps</p></div>
        <div class="mrfq-summary">
          <div class="mrfq-summary-row"><span>Project Site</span><strong id="mrfqSumSite">Not selected</strong></div>
          <div class="mrfq-summary-row"><span>Category</span><strong id="mrfqSumCat">Not selected</strong></div>
          <div class="mrfq-summary-row"><span>Total Items</span><strong id="mrfqSumItems">0</strong></div>
          <div class="mrfq-summary-row"><span>Delivery Date</span><strong id="mrfqSumDate">Not set</strong></div>
          <div class="mrfq-summary-row"><span>Unloading</span><strong id="mrfqSumUnload">Not selected</strong></div>
          <div class="mrfq-total">
            <div class="mrfq-total-row"><span>Material Cost</span><strong id="mrfqMaterialCost">₹0</strong></div>
            <div class="mrfq-total-row"><span>Est. Freight / Logistics</span><strong id="mrfqFreight">₹0</strong></div>
            <div class="mrfq-total-row grand"><span>Estimated Total</span><strong id="mrfqTotal">₹0</strong></div>
          </div>
        </div>
      </div>
      <div class="mrfq-side-card">
        <div class="mrfq-side-head"><h3>How it works</h3></div>
        <div class="mrfq-help">
          <div><i class="fa-solid fa-layer-group"></i><span>Select a material category to narrow the catalog.</span></div>
          <div><i class="fa-solid fa-location-dot"></i><span>Add the project site, delivery date and truck access details.</span></div>
          <div><i class="fa-solid fa-list-check"></i><span>Add multiple materials with grade, brand, quantity and target price.</span></div>
          <div><i class="fa-solid fa-file-invoice"></i><span>Set payment, GST billing and supplier preferences.</span></div>
          <div><i class="fa-solid fa-paper-plane"></i><span>Review everything and publish the RFQ to suppliers.</span></div>
        </div>
      </div>
    </aside>
  </div>
</div>`;
}

function mrfqStep1(){
    return `<div class="mrfq-card">
      <div class="mrfq-card-head"><div><h2>Step 1: Material Category Selection</h2><p>Choose the primary category for your bulk material requirement.</p></div></div>
      <div class="mrfq-card-body">
        <div class="mrfq-field full"><label>Select Primary Category <span class="req">*</span></label>
          <div class="mrfq-category-grid">
            ${mrfqCategories.map(c=>`<div class="mrfq-category ${window.mrfqCategory===c.id?"active":""}" onclick="mrfqSelectCategory('${c.id}')">
              <i class="fa-solid ${c.icon}"></i><strong>${c.name}</strong><span>${c.desc}</span>
            </div>`).join("")}
          </div>
        </div>
      </div>
    </div>`;
}

function mrfqStep2(){
    return `<div class="mrfq-card">
      <div class="mrfq-card-head"><div><h2>Step 2: Delivery & Project Site Details</h2><p>Where and when do the materials need to be dropped off?</p></div></div>
      <div class="mrfq-card-body">
        <div class="mrfq-grid">
          <div class="mrfq-field">
            <label>Select Project Site <span class="req">*</span></label>
            <div class="mrfq-inline"><select class="mrfq-select" id="mrfqProjectSite" onchange="mrfqSiteChange(this.value)">
              <option value="">Select active project</option><option value="Green Valley Residency">Green Valley Residency</option><option value="Commercial Tower - Sector 62">Commercial Tower - Sector 62</option>
            </select><button class="mrfq-small-btn" onclick="mrfqAddSite()">+ Add New Site</button></div>
          </div>
          <div class="mrfq-field"><label>Expected Delivery Date <span class="req">*</span></label><input id="mrfqDate" class="mrfq-input" type="date" onchange="mrfqUpdateSummary()"></div>
          <div class="mrfq-field full"><label>Delivery Address <span class="req">*</span></label><textarea id="mrfqAddress" class="mrfq-textarea" placeholder="Delivery address at project site..."></textarea></div>
          <div class="mrfq-field"><label>Unloading Responsibility <span class="req">*</span></label>
            <div class="mrfq-radio-row">
              <label class="mrfq-radio"><input type="radio" name="mrfqUnload" value="Supplier" onchange="mrfqUpdateSummary()">Supplier needs to unload</label>
              <label class="mrfq-radio"><input type="radio" name="mrfqUnload" value="Contractor" onchange="mrfqUpdateSummary()">Contractor will unload</label>
            </div>
          </div>
          <div class="mrfq-field"><label>Truck Access Restrictions</label>
            <select id="mrfqTruck" class="mrfq-select"><option value="">Select access</option><option>Heavy Trucks Allowed (Trailers)</option><option>Medium Trucks Only</option><option>Small Tempos Only (Narrow streets)</option></select>
          </div>
        </div>
      </div>
    </div>`;
}

function mrfqMaterialRow(m,i){
    const grades=mrfqGrades[m.item]||["Standard","As per manufacturer"];
    const brands=["Tata Tiscon","JSW","UltraTech","Ambuja","ACC","Shree Cement","Open to any standard brand"];
    return `<tr>
      <td><input class="mrfq-item" list="mrfqItems" value="${mrfqEsc(m.item)}" placeholder="Search material" onchange="mrfqMaterialChange(${i},this.value)"></td>
      <td><select id="mrfqGrade${i}" onchange="mrfqMaterials[${i}].grade=this.value">${grades.map(g=>`<option ${m.grade===g?"selected":""}>${g}</option>`).join("")}</select></td>
      <td><div class="mrfq-brand-box">${brands.map(b=>`<span class="mrfq-brand-chip ${m.brands.includes(b)?"selected":""}" onclick="mrfqToggleBrand(${i},'${b.replace(/'/g,"&#39;")}')">${b}</span>`).join("")}</div></td>
      <td><input type="number" min="0" value="${m.quantity}" placeholder="Qty" onchange="mrfqMaterials[${i}].quantity=this.value;mrfqUpdateSummary()"></td>
      <td><select onchange="mrfqMaterials[${i}].unit=this.value;mrfqUpdateSummary()"><option value="">Unit</option>${["MT","Bags","Cubic Feet","Sq.Ft.","Pieces"].map(u=>`<option ${m.unit===u?"selected":""}>${u}</option>`).join("")}</select></td>
      <td><input type="number" min="0" value="${m.targetPrice}" placeholder="₹ Target" ${m.quoteFirst?"disabled":""} onchange="mrfqMaterials[${i}].targetPrice=this.value;mrfqUpdateSummary()"></td>
      <td><label class="mrfq-toggle"><input type="checkbox" ${m.quoteFirst?"checked":""} onchange="mrfqMaterials[${i}].quoteFirst=this.checked;mrfqRender()"> Let suppliers quote</label></td>
      <td><button class="mrfq-remove" onclick="mrfqRemoveMaterial(${i})"><i class="fa-solid fa-xmark"></i></button></td>
    </tr>`;
}

function mrfqStep3(){
    const opts=(mrfqMaterialOptions[window.mrfqCategory]||Object.values(mrfqMaterialOptions).flat()).map(x=>`<option value="${mrfqEsc(x)}"></option>`).join("");
    return `<div class="mrfq-card">
      <div class="mrfq-card-head"><div><h2>Step 3: Material Specifications & Quantities</h2><p>Add multiple materials to build your bulk order.</p></div><span style="font-size:9px;color:#7b8799">${mrfqMaterials.filter(x=>x.item).length} item(s)</span></div>
      <div class="mrfq-card-body">
        <div class="mrfq-note"><b>Bulk order:</b> Select material, grade/spec, preferred brands, quantity, unit and optional target price. You can choose “Let suppliers quote” when you do not want to reveal a target price.</div>
        <datalist id="mrfqItems">${opts}</datalist>
        <div class="mrfq-table-wrap"><table class="mrfq-table"><thead><tr><th>Material Item *</th><th>Grade / Spec *</th><th>Preferred Brand</th><th>Quantity *</th><th>Unit *</th><th>Target Price (₹)</th><th>Quote First</th><th>Action</th></tr></thead><tbody>${mrfqMaterials.map((m,i)=>mrfqMaterialRow(m,i)).join("")}</tbody></table></div>
        <button class="mrfq-add-row" onclick="mrfqAddMaterial()"><i class="fa-solid fa-plus"></i> Add Material</button>
      </div>
    </div>`;
}

function mrfqStep4(){
    return `<div class="mrfq-card">
      <div class="mrfq-card-head"><div><h2>Step 4: Commercials & Vendor Settings</h2><p>Set credit terms, compliant billing and supplier visibility.</p></div></div>
      <div class="mrfq-card-body">
        <div class="mrfq-grid">
          <div class="mrfq-field full"><label>Payment Terms <span class="req">*</span></label>
            <div class="mrfq-radio-row">
              ${["100% Advance","Payment on Delivery","15-Day Credit","30-Day Credit"].map(x=>`<label class="mrfq-radio"><input type="radio" name="mrfqPayment" value="${x}"> <strong>${x}</strong></label>`).join("")}
            </div>
          </div>
          <div class="mrfq-field"><label>Billing Entity (GST) <span class="req">*</span></label><select id="mrfqGstin" class="mrfq-select"><option value="">Select registered GSTIN</option><option>09AAAAA0000A1Z5 — BuildBid Contractor</option><option>09BBBBB1111B2Z6 — BuildBid Projects</option></select></div>
          <div class="mrfq-field"><label>Supplier Preference</label>
            <div class="mrfq-radio-row"><label class="mrfq-radio"><input type="radio" name="mrfqSupplier" value="all" checked> Broadcast to all verified suppliers</label><label class="mrfq-radio"><input type="radio" name="mrfqSupplier" value="saved"> Invite specific saved suppliers</label></div>
          </div>
          <div class="mrfq-field full"><label>Need Sample / Test Report?</label><label class="mrfq-toggle" style="padding:11px;border:1px solid #dde4ee;border-radius:6px"><input id="mrfqMtc" type="checkbox"> Supplier must provide MTC (Material Test Certificate)</label></div>
          <div class="mrfq-field full"><label>Special Notes</label><textarea id="mrfqNotes" class="mrfq-textarea" placeholder="E.g. Need fresh cement, manufacturing date not older than 2 weeks."></textarea></div>
        </div>
      </div>
    </div>`;
}

function mrfqStep5(){
    const rows=mrfqMaterials.filter(x=>x.item);
    return `<div class="mrfq-card">
      <div class="mrfq-card-head"><div><h2>Step 5: Final Review & Post RFQ</h2><p>Read-only summary of all information before alerting suppliers.</p></div></div>
      <div class="mrfq-card-body">
        <div class="mrfq-review-grid">
          <div class="mrfq-review-item"><span>RFQ Title</span><strong>${mrfqEsc(window.mrfqTitle||"Bulk Material Requirement")}</strong></div>
          <div class="mrfq-review-item"><span>Primary Category</span><strong>${mrfqEsc((mrfqCategories.find(x=>x.id===window.mrfqCategory)||{}).name||"—")}</strong></div>
          <div class="mrfq-review-item"><span>Project Site</span><strong>${mrfqEsc(window.mrfqSite||"—")}</strong></div>
          <div class="mrfq-review-item"><span>Delivery Address</span><strong>${mrfqEsc(window.mrfqAddress||"—")}</strong></div>
          <div class="mrfq-review-item"><span>Expected Delivery</span><strong>${mrfqEsc(window.mrfqDate||"—")}</strong></div>
          <div class="mrfq-review-item"><span>Unloading</span><strong>${mrfqEsc(window.mrfqUnload||"—")}</strong></div>
          <div class="mrfq-review-item"><span>Truck Access</span><strong>${mrfqEsc(window.mrfqTruck||"—")}</strong></div>
          <div class="mrfq-review-item"><span>Payment Terms</span><strong>${mrfqEsc(window.mrfqPayment||"—")}</strong></div>
          <div class="mrfq-review-item"><span>Billing GSTIN</span><strong>${mrfqEsc(window.mrfqGstin||"—")}</strong></div>
          <div class="mrfq-review-item"><span>Supplier Preference</span><strong>${window.mrfqSupplier==="saved"?"Invite saved suppliers":"Broadcast to all verified suppliers"}</strong></div>
          <div class="mrfq-review-item"><span>MTC Required</span><strong>${window.mrfqMtc?"Yes":"No"}</strong></div>
          <div class="mrfq-review-item"><span>Special Notes</span><strong>${mrfqEsc(window.mrfqNotes||"—")}</strong></div>
        </div>
        <div class="mrfq-review-materials">
          <h3 style="font-size:12px;margin-bottom:8px">Selected Materials (${rows.length})</h3>
          <div class="mrfq-table-wrap"><table class="mrfq-table"><thead><tr><th>Item</th><th>Grade / Spec</th><th>Preferred Brands</th><th>Quantity</th><th>Unit</th><th>Target Price</th></tr></thead><tbody>
          ${rows.length?rows.map(x=>`<tr><td>${mrfqEsc(x.item)}</td><td>${mrfqEsc(x.grade||"—")}</td><td>${mrfqEsc(x.brands.join(", ")||"Open to any standard brand")}</td><td>${mrfqEsc(x.quantity||"—")}</td><td>${mrfqEsc(x.unit||"—")}</td><td>${x.quoteFirst?"Let Suppliers Quote First":x.targetPrice?"₹"+Number(x.targetPrice).toLocaleString("en-IN"):"—"}</td></tr>`).join(""):`<tr><td colspan="6" style="text-align:center;color:#8994a4;padding:20px">No materials added.</td></tr>`}
          </tbody></table></div>
        </div>
      </div>
    </div>`;
}

function mrfqRender(){
    const el=document.getElementById("mrfqStepContent");
    if(!el)return;
    el.innerHTML=[null,mrfqStep1,mrfqStep2,mrfqStep3,mrfqStep4,mrfqStep5][mrfqStep]();
    if(mrfqStep===2){
      if(window.mrfqSite)document.getElementById("mrfqProjectSite").value=window.mrfqSite;
      if(window.mrfqAddress)document.getElementById("mrfqAddress").value=window.mrfqAddress;
      if(window.mrfqDate)document.getElementById("mrfqDate").value=window.mrfqDate;
      if(window.mrfqTruck)document.getElementById("mrfqTruck").value=window.mrfqTruck;
      document.querySelectorAll('input[name="mrfqUnload"]').forEach(x=>x.checked=x.value===window.mrfqUnload);
    }
    if(mrfqStep===4){
      document.querySelectorAll('input[name="mrfqPayment"]').forEach(x=>x.checked=x.value===window.mrfqPayment);
      document.querySelectorAll('input[name="mrfqSupplier"]').forEach(x=>x.checked=x.value===(window.mrfqSupplier||"all"));
      if(document.getElementById("mrfqGstin"))document.getElementById("mrfqGstin").value=window.mrfqGstin||"";
      if(document.getElementById("mrfqMtc"))document.getElementById("mrfqMtc").checked=!!window.mrfqMtc;
      if(document.getElementById("mrfqNotes"))document.getElementById("mrfqNotes").value=window.mrfqNotes||"";
    }
    document.querySelectorAll(".mrfq-step").forEach((x,i)=>{x.classList.toggle("active",i+1===mrfqStep);x.classList.toggle("done",i+1<mrfqStep);});
    mrfqUpdateSummary();
}

function mrfqSync(){
    const site=document.getElementById("mrfqProjectSite"), address=document.getElementById("mrfqAddress"), date=document.getElementById("mrfqDate"), truck=document.getElementById("mrfqTruck");
    if(site)window.mrfqSite=site.value;
    if(address)window.mrfqAddress=address.value;
    if(date)window.mrfqDate=date.value;
    if(truck)window.mrfqTruck=truck.value;
    const unload=document.querySelector('input[name="mrfqUnload"]:checked'); if(unload)window.mrfqUnload=unload.value;
    const pay=document.querySelector('input[name="mrfqPayment"]:checked'); if(pay)window.mrfqPayment=pay.value;
    const sup=document.querySelector('input[name="mrfqSupplier"]:checked'); if(sup)window.mrfqSupplier=sup.value;
    const gst=document.getElementById("mrfqGstin"); if(gst)window.mrfqGstin=gst.value;
    const mtc=document.getElementById("mrfqMtc"); if(mtc)window.mrfqMtc=mtc.checked;
    const notes=document.getElementById("mrfqNotes"); if(notes)window.mrfqNotes=notes.value;
}

function mrfqValidate(step){
    mrfqSync();
    if(step===1&&!window.mrfqCategory){showToast("Please select a primary material category");return false;}
    if(step===2&&(!window.mrfqSite||!window.mrfqAddress||!window.mrfqDate||!window.mrfqUnload)){showToast("Please complete all required delivery & site details");return false;}
    if(step===3){
      const valid=mrfqMaterials.filter(x=>x.item);
      if(!valid.length){showToast("Please add at least one material");return false;}
      if(valid.some(x=>!x.grade||!x.quantity||!x.unit)){showToast("Please complete material grade, quantity and unit");return false;}
    }
    if(step===4&&(!window.mrfqPayment||!window.mrfqGstin)){showToast("Please select payment terms and GST billing entity");return false;}
    return true;
}

function mrfqShowStep(step){
    if(step>mrfqStep&&!mrfqValidate(mrfqStep))return;
    mrfqSync();mrfqStep=step;mrfqRender();window.scrollTo({top:0,behavior:"smooth"});
}
function mrfqNext(){if(mrfqValidate(mrfqStep)){mrfqStep=Math.min(5,mrfqStep+1);mrfqRender();window.scrollTo({top:0,behavior:"smooth"});}}
function mrfqPrev(){mrfqSync();mrfqStep=Math.max(1,mrfqStep-1);mrfqRender();window.scrollTo({top:0,behavior:"smooth"});}
function mrfqSelectCategory(id){window.mrfqCategory=id;mrfqRender();}
function mrfqSiteChange(v){
    window.mrfqSite=v;
    if(v==="Green Valley Residency"&&document.getElementById("mrfqAddress"))document.getElementById("mrfqAddress").value="Sector 62, Noida, UP";
    if(v==="Commercial Tower - Sector 62"&&document.getElementById("mrfqAddress"))document.getElementById("mrfqAddress").value="Sector 62, Noida, UP";
    mrfqUpdateSummary();
}
function mrfqAddSite(){
    const name=prompt("Enter new project site name:");
    if(!name)return;
    window.mrfqSite=name;
    const select=document.getElementById("mrfqProjectSite");
    if(select){const o=document.createElement("option");o.value=name;o.textContent=name;select.appendChild(o);select.value=name;}
    mrfqUpdateSummary();
}
function mrfqMaterialChange(i,v){
    mrfqMaterials[i].item=v;
    const grades=mrfqGrades[v]||["Standard","As per manufacturer"];
    mrfqMaterials[i].grade=grades[0];
    mrfqRender();
}
function mrfqToggleBrand(i,b){
    const arr=mrfqMaterials[i].brands;
    const pos=arr.indexOf(b);pos>=0?arr.splice(pos,1):arr.push(b);
    mrfqRender();
}
function mrfqAddMaterial(){mrfqMaterials.push({item:"",grade:"",brands:[],quantity:"",unit:"",targetPrice:"",quoteFirst:false});mrfqRender();}
function mrfqRemoveMaterial(i){if(mrfqMaterials.length===1){mrfqMaterials[0]={item:"",grade:"",brands:[],quantity:"",unit:"",targetPrice:"",quoteFirst:false};}else mrfqMaterials.splice(i,1);mrfqRender();}
function mrfqUpdateSummary(){
    mrfqSync();
    const items=mrfqMaterials.filter(x=>x.item);
    const materialCost=items.reduce((sum,x)=>sum+(Number(x.quantity||0)*Number(x.targetPrice||0)),0);
    const freight=items.length?(window.mrfqUnload==="Supplier"?Math.round(materialCost*.05):Math.round(materialCost*.025)):0;
    const cat=(mrfqCategories.find(x=>x.id===window.mrfqCategory)||{}).name||"Not selected";
    const set=(id,val)=>{const e=document.getElementById(id);if(e)e.textContent=val;};
    set("mrfqSumSite",window.mrfqSite||"Not selected");set("mrfqSumCat",cat);set("mrfqSumItems",items.length);set("mrfqSumDate",window.mrfqDate||"Not set");set("mrfqSumUnload",window.mrfqUnload||"Not selected");
    set("mrfqMaterialCost","₹"+materialCost.toLocaleString("en-IN"));set("mrfqFreight","₹"+freight.toLocaleString("en-IN"));set("mrfqTotal","₹"+(materialCost+freight).toLocaleString("en-IN"));
}
function mrfqRenderRefresh(){mrfqRender();}
function saveMaterialRFQDraft(){mrfqSync();showToast("Material RFQ saved as draft");}
function publishMaterialRFQ(){
    if(!mrfqValidate(4)||!mrfqValidate(3)||!mrfqValidate(2)||!mrfqValidate(1))return;
    showToast("Material Request (RFQ) published to suppliers");
}
function initMaterialsRFQ(){
    mrfqStep=1;
    mrfqMaterials=[{item:"",grade:"",brands:[],quantity:"",unit:"",targetPrice:"",quoteFirst:false}];
    window.mrfqCategory=null;window.mrfqSite="";window.mrfqAddress="";window.mrfqDate="";window.mrfqUnload="";window.mrfqTruck="";window.mrfqPayment="";window.mrfqGstin="";window.mrfqSupplier="all";window.mrfqMtc=false;window.mrfqNotes="";window.mrfqTitle="Bulk Material Requirement";
    mrfqRender();
}

/* =====================================================
   EARNINGS
===================================================== */

function earningsHTML(){

return `

<div class="page-title">

    <div>

        <h1>Earnings</h1>

        <p>
            Track your project earnings and payments.
        </p>

    </div>

</div>


<div class="stats">

    <div class="stat-card">

        <div class="stat-top">

            <div class="stat-icon green">
                <i class="fa-solid fa-indian-rupee-sign"></i>
            </div>

            <div>

                <div class="stat-name">
                    Total Earnings
                </div>

                <div class="stat-number">
                    ₹28.75L
                </div>

            </div>

        </div>

    </div>


    <div class="stat-card">

        <div class="stat-top">

            <div class="stat-icon blue">
                <i class="fa-solid fa-calendar"></i>
            </div>

            <div>

                <div class="stat-name">
                    This Month
                </div>

                <div class="stat-number">
                    ₹3.45L
                </div>

            </div>

        </div>

    </div>


    <div class="stat-card">

        <div class="stat-top">

            <div class="stat-icon orange">
                <i class="fa-solid fa-hourglass-half"></i>
            </div>

            <div>

                <div class="stat-name">
                    Pending
                </div>

                <div class="stat-number">
                    ₹1.20L
                </div>

            </div>

        </div>

    </div>


    <div class="stat-card">

        <div class="stat-top">

            <div class="stat-icon purple">
                <i class="fa-solid fa-chart-line"></i>
            </div>

            <div>

                <div class="stat-name">
                    Growth
                </div>

                <div class="stat-number">
                    +18%
                </div>

            </div>

        </div>

    </div>

</div>


<div class="dynamic-card">

    <div class="card-header">

        <h2>Recent Payments</h2>

    </div>


    <div class="order-item">

        <div>

            <div class="order-name">
                Interior Work – Office Space
            </div>

            <div class="order-sub">
                Contract #301
            </div>

        </div>

        <div>

            <div class="order-label">
                Payment
            </div>

            <div class="order-value">
                ₹2,50,000
            </div>

        </div>

        <div>

            <div class="order-label">
                Date
            </div>

            <div class="order-value">
                02 Sep 2026
            </div>

        </div>

        <div>

            <span class="status-pill status-delivered">
                Paid
            </span>

        </div>

        <div></div>

    </div>

</div>

`;
}


/* =====================================================
   NOTIFICATIONS
===================================================== */

function notificationsHTML(){

return `

<div class="page-title">

    <div>

        <h1>Notifications</h1>

        <p>
            Stay updated with your projects and orders.
        </p>

    </div>

    <button
        class="action-btn"
        onclick="markNotifications()">

        Mark All Read

    </button>

</div>


<div class="dynamic-card">

    <div class="notifications">

        ${notification(
            "fa-solid fa-eye",
            'Your bid for "3BHK House Construction" has been viewed by customer.',
            "1 hour ago"
        )}

        ${notification(
            "fa-solid fa-comments",
            "You have received a new message from Rahul Verma.",
            "3 hours ago"
        )}

        ${notification(
            "fa-solid fa-arrow-trend-up",
            'Your bid for "Commercial Building" is leading.',
            "5 hours ago"
        )}

        ${notification(
            "fa-solid fa-trophy",
            'Congratulations! You won the "Interior Work – Office Space" project.',
            "Yesterday"
        )}

        ${notification(
            "fa-solid fa-truck",
            "Your material order ORD-1024 has been dispatched.",
            "Yesterday"
        )}

    </div>

</div>

`;
}


/* =====================================================
   SIMPLE PAGE
===================================================== */

function simplePage(title,description,icon){

return `

<div class="page-title">

    <div>

        <h1>${title}</h1>

        <p>${description}</p>

    </div>

</div>


<div class="dynamic-card"
     style="padding:60px;text-align:center;">

    <div style="
        width:70px;
        height:70px;
        margin:0 auto 18px;
        border-radius:50%;
        background:#eaf2ff;
        color:#1765ca;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:25px;
    ">

        <i class="fa-solid ${icon}"></i>

    </div>

    <h2 style="font-size:16px;margin-bottom:8px;">
        ${title}
    </h2>

    <p style="
        color:#758196;
        font-size:11px;
        margin-bottom:20px;
    ">
        This section is ready for your BuildBid workflow.
    </p>

    <button
        class="action-btn"
        onclick="showToast('${title} opened successfully')">

        Open ${title}

    </button>

</div>

`;
}


/* =====================================================
   PROJECT FILTER
===================================================== */

function filterProjects(type,element){

    document
        .querySelectorAll(".tabs .tab")
        .forEach(t => t.classList.remove("active"));

    element.classList.add("active");

    const rows =
        document.querySelectorAll(
            "#dashboardProjects .project-row"
        );

    rows.forEach(row => {

        const status =
            row.dataset.status;

        if(type === "all"){
            row.style.display = "grid";
        }

        else if(type === "open"){
            row.style.display =
                status === "open"
                ? "grid"
                : "none";
        }

        else if(type === "won"){
            row.style.display =
                status === "won"
                ? "grid"
                : "none";
        }

        else if(type === "upcoming"){
            row.style.display = "none";
        }

    });

    if(type === "upcoming"){

        showToast(
            "No upcoming projects available"
        );

    }

}


/* =====================================================
   ORDER FILTER
===================================================== */

function filterOrders(type,button){

    document
        .querySelectorAll(".filter-btn")
        .forEach(b => b.classList.remove("active"));

    button.classList.add("active");

    document
        .querySelectorAll(".order-item[data-order-status]")
        .forEach(order => {

            if(
                type === "all" ||
                order.dataset.orderStatus === type
            ){

                order.style.display = "grid";

            }else{

                order.style.display = "none";

            }

        });

}


/* =====================================================
   SEARCH ORDERS
===================================================== */

function searchOrders(value){

    value = value.toLowerCase();

    document
        .querySelectorAll(".order-item[data-order-status]")
        .forEach(order => {

            const text =
                order.innerText.toLowerCase();

            order.style.display =
                text.includes(value)
                ? "grid"
                : "none";

        });

}


/* =====================================================
   TRACK ORDER
===================================================== */

function trackOrder(id){

    loadPage("track");

    setTimeout(() => {

        showToast(
            "Tracking " + id
        );

    },200);

}


/* =====================================================
   PROJECT DETAILS
===================================================== */

function projectDetails(name){

    // Close any previously opened inline details.
    document.querySelectorAll('.project-details-inline').forEach(el => el.remove());

    const rows = Array.from(document.querySelectorAll('#dashboardProjects .project-row'));
    const row = rows.find(r => {
        const title = r.querySelector('.project-name');
        return title && title.textContent.trim() === name.trim();
    });

    if(!row) return;

    const location = row.querySelector('.project-location')?.textContent.trim() || '—';
    const budgetText = row.querySelector('.project-budget')?.textContent.trim() || '—';
    const date = row.querySelector('.project-date')?.textContent.trim() || '—';
    const bids = row.querySelector('.project-bids')?.textContent.trim() || '—';
    const status = row.dataset.status === 'won' ? 'Won' : 'Open for Bidding';

    const details = document.createElement('div');
    details.className = 'project-details-inline';
    details.innerHTML = `
        <h3>Project Details</h3>
        <div class="project-details-inline-grid">
            <div class="project-details-inline-item"><span>Project Name</span><strong>${name}</strong></div>
            <div class="project-details-inline-item"><span>Location</span><strong>${location}</strong></div>
            <div class="project-details-inline-item"><span>Budget</span><strong>${budgetText.replace(/^Budget:\s*/i,'')}</strong></div>
            <div class="project-details-inline-item"><span>Posted On</span><strong>${date}</strong></div>
            <div class="project-details-inline-item"><span>Total Bids</span><strong>${bids}</strong></div>
            <div class="project-details-inline-item"><span>Status</span><strong>${status}</strong></div>
        </div>`;

    row.insertAdjacentElement('afterend', details);
    document.body.classList.add('project-details-page-open');
}



/* =====================================================
   PROFILE
===================================================== */

function openProfile(){

    const modal =
        document.getElementById("profileModal");

    modal.classList.add("show");

    document.querySelector(
        "#profileModal .modal-header h2"
    ).textContent =
        "Edit Contractor Profile";

    document.querySelectorAll(
        "#profileModal .form-group"
    ).forEach(group => {

        group.style.display = "block";

    });

    document.querySelector(
        "#profileModal .modal-save"
    ).textContent =
        "Save Changes";

    document.querySelector(
        "#profileModal .modal-save"
    ).onclick =
        saveProfile;

}


function closeModal(){

    document
        .getElementById("profileModal")
        .classList.remove("show");

}


function saveProfile(){

    showToast(
        "Profile updated successfully"
    );

    closeModal();

}


/* =====================================================
   PREMIUM
===================================================== */

function upgradePremium(){

    showToast(
        "Premium upgrade opened"
    );

}


/* =====================================================
   NOTIFICATIONS
===================================================== */

function markNotifications(){

    document
        .querySelectorAll(".notification-dot")
        .forEach(dot => {

            dot.style.display = "none";

        });

    showToast(
        "All notifications marked as read"
    );

}


/* =====================================================
   TOAST
===================================================== */

function showToast(message){

    const toast =
        document.getElementById("toast");

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    },2200);

}



/* =====================================================
   GET VERIFIED / CONTRACTOR VERIFICATION V4
===================================================== */
let vfyStep = 1;
function verificationHTML(){
return `
<div class="vfy-page">
  <div class="vfy-breadcrumb"><span>Dashboard</span><i class="fa-solid fa-chevron-right"></i><b>Get Verified</b></div>
  <div class="vfy-header"><div><h1>Get Verified</h1><p>Complete the required details to get a verified badge and become a verified contractor.</p></div></div>
  <div class="vfy-layout">
    <main class="vfy-main">
      <div class="vfy-card" style="padding:0;overflow:hidden">
        <div class="vfy-progress">
          ${[['1','Personal & Identity'],['2','Business & Tax'],['3','Labor Compliance'],['4','Bank Details'],['5','Review & Submit']].map(x=>`<button class="vfy-step ${x[0]==='1'?'active':''}" data-vfy-step="${x[0]}"><span>${x[0]}</span><b>${x[1]}</b></button>`).join('')}
        </div>
      </div>

      <section class="vfy-card vfy-pane active" data-vfy-pane="1">
        <div class="vfy-title"><span>1</span><div><h2>Personal & Identity Verification</h2><p>Verify your personal identity using your PAN and supporting documents.</p></div></div>
        <div class="vfy-grid">
          <div class="vfy-field"><label>PAN Number <span class="vfy-required">*</span></label><input id="vfyPan" maxlength="10" placeholder="ABCDE1234F" style="text-transform:uppercase"><small class="vfy-help">10-character alphanumeric PAN.</small></div>
          <div class="vfy-field"><label>Upload PAN Card</label><div class="vfy-upload"><input id="vfyPanDoc" type="file" accept="image/*,.pdf"></div></div>
          <div class="vfy-field"><label>Character Certificate</label><div class="vfy-upload"><input id="vfyCharacter" type="file" accept="image/*,.pdf"></div><small class="vfy-help">Can be issued by local police or gazetted officer.</small></div>
        </div>
      </section>

      <section class="vfy-card vfy-pane" data-vfy-pane="2">
        <div class="vfy-title"><span>2</span><div><h2>Business & Tax Details</h2><p>Enter your GST details. Registered details can be fetched through the API.</p></div></div>
        <div class="vfy-grid">
          <div class="vfy-field"><label>GSTIN Number <span class="vfy-required">*</span></label><div class="vfy-input-row"><input id="vfyGstin" maxlength="15" placeholder="09ABCDE1234F1Z5" style="text-transform:uppercase"><button type="button" class="vfy-fetch" onclick="vfyFetch('GSTIN')">Fetch Details</button></div></div>
          <div class="vfy-field"><label>Registered Business Name <span class="vfy-required">*</span></label><input id="vfyBusinessName" placeholder="Business name"></div>
          <div class="vfy-field full"><label>Registered Address <span class="vfy-required">*</span></label><textarea id="vfyAddress" placeholder="Registered business address"></textarea></div>
          <div class="vfy-field"><label>Upload GST Certificate</label><div class="vfy-upload"><input id="vfyGstDoc" type="file" accept="image/*,.pdf"></div></div>
        </div>
      </section>

      <section class="vfy-card vfy-pane" data-vfy-pane="3">
        <div class="vfy-title"><span>3</span><div><h2>Labor Compliance & Licenses</h2><p>These details are optional for basic onboarding, but can be added for labor compliance.</p></div></div>
        <div class="vfy-note">Contractors hiring labor must comply with applicable state and central laws. Providing these details is <strong>not required for basic onboarding</strong>.</div>
        <div class="vfy-grid">
          <div class="vfy-field"><label>Labor License Number</label><div class="vfy-input-row"><input id="vfyLabor" placeholder="Labor license number"><button type="button" class="vfy-fetch" onclick="vfyFetch('Labor License')">Fetch Details</button></div></div>
          <div class="vfy-field"><label>Upload Labor License</label><div class="vfy-upload"><input id="vfyLaborDoc" type="file" accept="image/*,.pdf"></div></div>
          <div class="vfy-field"><label>EPF Registration No.</label><div class="vfy-input-row"><input id="vfyEpf" placeholder="EPF registration number"><button type="button" class="vfy-fetch" onclick="vfyFetch('EPF')">Fetch Details</button></div></div>
          <div class="vfy-field"><label>Upload EPF Certificate</label><div class="vfy-upload"><input id="vfyEpfDoc" type="file" accept="image/*,.pdf"></div></div>
          <div class="vfy-field"><label>ESI Registration No.</label><div class="vfy-input-row"><input id="vfyEsi" placeholder="ESI registration number"><button type="button" class="vfy-fetch" onclick="vfyFetch('ESI')">Fetch Details</button></div></div>
          <div class="vfy-field"><label>Upload ESI Certificate</label><div class="vfy-upload"><input id="vfyEsiDoc" type="file" accept="image/*,.pdf"></div></div>
        </div>
      </section>

      <section class="vfy-card vfy-pane" data-vfy-pane="4">
        <div class="vfy-title"><span>4</span><div><h2>Bank Details & Financials</h2><p>Add the bank account that matches your registered business details.</p></div></div>
        <div class="vfy-grid">
          <div class="vfy-field"><label>Bank Account Name <span class="vfy-required">*</span></label><input id="vfyAccountName" placeholder="Must match Business Name"></div>
          <div class="vfy-field"><label>Account Number <span class="vfy-required">*</span></label><input id="vfyAccount" type="password" inputmode="numeric" placeholder="Account number"></div>
          <div class="vfy-field"><label>Confirm Account Number <span class="vfy-required">*</span></label><input id="vfyAccountConfirm" type="password" inputmode="numeric" placeholder="Confirm account number"></div>
          <div class="vfy-field"><label>IFSC Code <span class="vfy-required">*</span></label><div class="vfy-input-row"><input id="vfyIfsc" maxlength="11" placeholder="HDFC0000123" style="text-transform:uppercase"><button type="button" class="vfy-fetch" onclick="vfyFetch('IFSC Branch')">Fetch Branch</button></div></div>
          <div class="vfy-field"><label>Upload Cancelled Cheque</label><div class="vfy-upload"><input id="vfyCheque" type="file" accept="image/*,.pdf"></div></div>
        </div>
      </section>

      <section class="vfy-card vfy-pane" data-vfy-pane="5">
        <div class="vfy-title"><span>5</span><div><h2>Review & Submit</h2><p>Review all manually entered and fetched details before submitting.</p></div></div>
        <div id="vfyReview" class="vfy-review-grid"></div>
        <label class="vfy-declaration"><input id="vfyDeclaration" type="checkbox"><span><strong>Declaration *</strong><br>I hereby declare that all documents and information provided are true. I authorize Buildbid to verify these details via third-party APIs.</span></label>
        <div id="vfySuccess" class="vfy-success"><div class="check">✓</div><h2>Application Submitted</h2><p>Your verification application is ready for backend submission.</p></div>
      </section>

      <div class="vfy-actions">
        <button class="vfy-btn secondary" id="vfyBack">← Back</button>
        <span id="vfyStepText" style="font-size:10px;color:#7a8493">Step 1 of 5</span>
        <div class="vfy-actions-right"><button class="vfy-btn primary" id="vfyNext">Next →</button></div>
      </div>
    </main>

    <aside class="vfy-side"><div class="vfy-side-sticky">
      <div class="vfy-side-card"><h3>Verification Status</h3><div class="vfy-status"><div class="vfy-status-icon">✓</div><div><b>Not Verified</b><small>Complete all required details to apply.</small></div></div></div>
      <div class="vfy-side-card"><h3>Required for Verification</h3><ul class="vfy-list"><li>PAN Number</li><li>GSTIN Number</li><li>Registered Business Name</li><li>Registered Address</li><li>Bank Account Name</li><li>Account Number + Confirmation</li><li>IFSC Code</li><li>Declaration in Step 5</li></ul></div>
      <div class="vfy-side-card"><h3>Optional Documents</h3><ul class="vfy-list"><li>PAN Card</li><li>Character Certificate</li><li>GST Certificate</li><li>Labor License</li><li>EPF / ESI Certificates</li><li>Cancelled Cheque</li></ul></div>
    </div></aside>
  </div>
</div>`;
}

function vfyFetch(type){
  showToast(type+' fetch API ready — connect Spring Boot endpoint');
}
function vfyValue(id){return document.getElementById(id)?.value||'';}
function vfyReview(){
  const vals=[['PAN Number',vfyValue('vfyPan')||'—'],['GSTIN Number',vfyValue('vfyGstin')||'—'],['Registered Business Name',vfyValue('vfyBusinessName')||'—'],['Registered Address',vfyValue('vfyAddress')||'—'],['Labor License Number',vfyValue('vfyLabor')||'Not provided'],['EPF Registration No.',vfyValue('vfyEpf')||'Not provided'],['ESI Registration No.',vfyValue('vfyEsi')||'Not provided'],['Bank Account Name',vfyValue('vfyAccountName')||'—'],['Account Number',vfyValue('vfyAccount')?'••••'+vfyValue('vfyAccount').slice(-4):'—'],['IFSC Code',vfyValue('vfyIfsc')||'—']];
  const box=document.getElementById('vfyReview'); if(!box)return; box.innerHTML=vals.map(x=>`<div class="vfy-review-item"><small>${x[0]}</small><b>${escapeHTML(x[1])}</b></div>`).join('');
}
function vfyValidate(step){
  const req={1:['vfyPan'],2:['vfyGstin','vfyBusinessName','vfyAddress'],4:['vfyAccountName','vfyAccount','vfyAccountConfirm','vfyIfsc']}[step]||[];
  for(const id of req){const e=document.getElementById(id);if(!e?.value.trim()){showToast('Please complete required fields');e?.focus();return false;}}
  if(step===1 && !/^[A-Za-z0-9]{10}$/.test(vfyValue('vfyPan').trim())){showToast('PAN must be 10 alphanumeric characters');return false;}
  if(step===2 && !/^[A-Za-z0-9]{15}$/.test(vfyValue('vfyGstin').trim())){showToast('GSTIN must be 15 characters');return false;}
  if(step===4 && vfyValue('vfyAccount')!==vfyValue('vfyAccountConfirm')){showToast('Account numbers do not match');return false;}
  if(step===4 && !/^[A-Za-z0-9]{11}$/.test(vfyValue('vfyIfsc').trim())){showToast('Enter a valid 11-character IFSC code');return false;}
  return true;
}
function vfyShow(step){
  vfyStep=step;
  document.querySelectorAll('.vfy-pane').forEach(p=>p.classList.toggle('active',Number(p.dataset.vfyPane)===step));
  document.querySelectorAll('.vfy-step').forEach(b=>{const n=Number(b.dataset.vfyStep);b.classList.toggle('active',n===step);b.classList.toggle('done',n<step);});
  document.getElementById('vfyBack').style.visibility=step===1?'hidden':'visible';
  document.getElementById('vfyNext').textContent=step===5?'Submit Application':'Next →';
  document.getElementById('vfyStepText').textContent='Step '+step+' of 5';
  if(step===5)vfyReview();
  window.scrollTo({top:0,behavior:'smooth'});
}
function initVerification(){
  vfyStep=1;
  document.querySelectorAll('.vfy-step').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.vfyStep);if(n>vfyStep&&!vfyValidate(vfyStep))return;vfyShow(n);});
  document.getElementById('vfyBack').onclick=()=>{if(vfyStep>1)vfyShow(vfyStep-1)};
  document.getElementById('vfyNext').onclick=()=>{if(vfyStep<5){if(vfyValidate(vfyStep))vfyShow(vfyStep+1)}else{if(!document.getElementById('vfyDeclaration').checked){showToast('Please accept the declaration');return;}console.log('POST /api/contractor/verification',vfyPayload());document.getElementById('vfySuccess').classList.add('show');showToast('Verification application ready for submission');}};
  document.getElementById('vfyPan')?.addEventListener('input',e=>e.target.value=e.target.value.toUpperCase());
  document.getElementById('vfyGstin')?.addEventListener('input',e=>e.target.value=e.target.value.toUpperCase());
  document.getElementById('vfyIfsc')?.addEventListener('input',e=>e.target.value=e.target.value.toUpperCase());
  vfyShow(1);
}
function vfyPayload(){return {contractorId:'CONT-DEMO',identity:{panNumber:vfyValue('vfyPan'),panDocumentUrl:null,characterCertificateUrl:null},business:{gstin:vfyValue('vfyGstin'),businessName:vfyValue('vfyBusinessName'),registeredAddress:vfyValue('vfyAddress'),gstDocumentUrl:null},laborCompliance:{laborLicenseNumber:vfyValue('vfyLabor')||null,epfNumber:vfyValue('vfyEpf')||null,esiNumber:vfyValue('vfyEsi')||null},bankDetails:{accountName:vfyValue('vfyAccountName'),accountNumber:vfyValue('vfyAccount'),ifscCode:vfyValue('vfyIfsc'),cancelledChequeUrl:null}};}

/* =====================================================
   INITIAL LOAD
===================================================== */

document
    .getElementById("mainContent")
    .innerHTML = dashboardHTML;


/* =====================================================
   CLOSE MODAL OUTSIDE CLICK
===================================================== */

document
    .getElementById("profileModal")
    .addEventListener("click",function(e){

        if(e.target === this){

            closeModal();

        }

    });




/* =========================================================
   BUILD BID DATA LAYER — BACKEND READY
   Replace API_BASE with your deployed backend URL.
   Expected endpoints:
   POST /api/requirements
   GET  /api/requirements
   GET  /api/requirements/:id
   POST /api/bids
   GET  /api/bids?contractorId=...
   GET  /api/bids/customer/:customerId
   ========================================================= */
const API_BASE = window.BUILDBID_API_BASE || '';
const demoDB = {
  requirements: JSON.parse(localStorage.getItem('buildbid_requirements') || '[]'),
  bids: JSON.parse(localStorage.getItem('buildbid_bids') || '[]')
};
function persistDemoDB(){
  localStorage.setItem('buildbid_requirements', JSON.stringify(demoDB.requirements));
  localStorage.setItem('buildbid_bids', JSON.stringify(demoDB.bids));
}


async function apiRequest(path, options={}){
  const config={...options,headers:{'Content-Type':'application/json',...(options.headers||{})}};
  try{
    if(!API_BASE) throw new Error('demo');
    const res=await fetch(API_BASE+path,config);
    if(!res.ok) throw new Error('API '+res.status);
    return await res.json();
  }catch(e){
    return null;
  }
}
function openDataModal(id){const el=document.getElementById(id);if(el){el.classList.add('show');el.setAttribute('aria-hidden','false')}}
function closeDataModal(id){const el=document.getElementById(id);if(el){el.classList.remove('show');el.setAttribute('aria-hidden','true')}}
window.addEventListener('click',e=>{if(e.target.classList.contains('data-modal')) closeDataModal(e.target.id)});

async function createCustomerRequirement(e){
  e.preventDefault();
  const payload={
    title:reqTitle.value.trim(),
    customerName:reqCustomer.value.trim(),
    location:reqLocation.value.trim(),
    budget:reqBudget.value.trim(),
    projectType:reqType.value,
    trade:(document.getElementById('reqTrade')?.value||'General Contractor'),
    deadline:reqDeadline.value||null,
    details:reqDetails.value.trim(),
    status:'open',
    bidCount:0,
    createdAt:new Date().toISOString()
  };
  const result=await apiRequest('/api/requirements',{method:'POST',body:JSON.stringify(payload)});
  if(result){
    if(result.id) payload.id=result.id;
    demoDB.requirements.unshift(result && result.id ? {...payload,...result} : payload);
    persistDemoDB();
    showToast('Requirement published successfully');
  } else {
    payload.id='REQ-'+Date.now();
    demoDB.requirements.unshift(payload);
    persistDemoDB();
    showToast('Requirement published — contractors can now see it');
  }
  updateCustomerRequirementBadge();
  closeDataModal('customerRequirementModal');
  e.target.reset();
  if(typeof loadCustomerRequirements==='function' && document.getElementById('customerRequirementsFeed')) loadCustomerRequirements();
}

async function loadCustomerRequirements(){
  const result=await apiRequest('/api/requirements');
  const items=Array.isArray(result)?result:demoDB.requirements;
  if(Array.isArray(result)){demoDB.requirements=result;persistDemoDB();}
  renderCustomerRequirements(items);
  updateCustomerRequirementBadge(items);
  return items;
}

function customerRequirementsHTML(){
  const items=demoDB.requirements||[];
  const open=items.filter(r=>(r.status||'open').toLowerCase()==='open').length;
  const urgent=items.filter(r=>r.deadline).length;
  const bids=items.reduce((n,r)=>n+Number(r.bidCount||0),0);
  return `
  <div class="customer-req-page">
    <div class="customer-req-head">
      <div><div class="post-req-breadcrumb"><span>Dashboard</span><i class="fa-solid fa-chevron-right"></i><b>Customer Requirements</b></div><h1>Customer Requirements</h1><p>View live project requirements posted by customers and submit your bid.</p></div>
      <button class="customer-req-refresh" onclick="loadCustomerRequirements()"><i class="fa-solid fa-rotate"></i> Refresh Requirements</button>
    </div>
    <div class="customer-req-stats">
      <div class="customer-req-stat"><span>Total Requirements</span><strong id="reqTotalCount">${items.length}</strong></div>
      <div class="customer-req-stat"><span>Open Requirements</span><strong id="reqOpenCount">${open}</strong></div>
      <div class="customer-req-stat"><span>With Deadlines</span><strong id="reqDeadlineCount">${urgent}</strong></div>
      <div class="customer-req-stat"><span>Total Bids</span><strong id="reqBidCount">${bids}</strong></div>
    </div>
    <div class="customer-req-toolbar">
      <div class="customer-req-search"><i class="fa-solid fa-search"></i><input id="customerReqSearch" placeholder="Search project, location, trade..." oninput="filterCustomerRequirements()"></div>
      <div class="customer-req-filters">
        <button class="customer-req-filter active" data-filter="all" onclick="setCustomerReqFilter('all',this)">All</button>
        <button class="customer-req-filter" data-filter="open" onclick="setCustomerReqFilter('open',this)">Open</button>
        <button class="customer-req-filter" data-filter="residential" onclick="setCustomerReqFilter('Residential',this)">Residential</button>
        <button class="customer-req-filter" data-filter="commercial" onclick="setCustomerReqFilter('Commercial',this)">Commercial</button>
      </div>
    </div>
    <div id="customerRequirementsFeed" class="customer-req-grid"></div>
  </div>`;
}

let customerReqFilter='all';
function setCustomerReqFilter(filter,btn){
  customerReqFilter=filter;
  document.querySelectorAll('.customer-req-filter').forEach(b=>b.classList.remove('active'));
  btn?.classList.add('active');
  filterCustomerRequirements();
}
function filterCustomerRequirements(){
  const q=(document.getElementById('customerReqSearch')?.value||'').toLowerCase().trim();
  let items=demoDB.requirements||[];
  if(customerReqFilter==='open') items=items.filter(r=>(r.status||'open').toLowerCase()==='open');
  else if(customerReqFilter!=='all') items=items.filter(r=>String(r.projectType||'').toLowerCase()===customerReqFilter.toLowerCase());
  if(q) items=items.filter(r=>[r.title,r.customerName,r.location,r.trade,r.projectType,r.budget,r.details].some(v=>String(v||'').toLowerCase().includes(q)));
  renderCustomerRequirements(items);
}
function renderCustomerRequirements(items){
  const box=document.getElementById('customerRequirementsFeed');
  if(!box)return;
  if(!items.length){box.className='customer-req-grid';box.innerHTML='<div class="customer-empty-state" style="grid-column:1/-1"><i class="fa-regular fa-clipboard"></i><h3>No customer requirements found</h3><p>New customer requirements will appear here automatically after they are published.</p></div>';return;}
  box.className='customer-req-grid';
  box.innerHTML=items.map(r=>{
    const id=escapeHTML(r.id||'');
    const title=escapeHTML(r.title||'Untitled Project');
    const status=escapeHTML(r.status||'open');
    return `<article class="customer-request-card">
      <div class="customer-request-top"><div><h3>${title}</h3><div class="customer-request-customer"><i class="fa-regular fa-user"></i> ${escapeHTML(r.customerName||'Customer')}</div></div><span class="customer-request-status">${status}</span></div>
      <div class="customer-request-meta">
        <div><span>Location</span><strong><i class="fa-solid fa-location-dot"></i> ${escapeHTML(r.location||'-')}</strong></div>
        <div><span>Budget</span><strong>${escapeHTML(r.budget||'Negotiable')}</strong></div>
        <div><span>Work / Trade</span><strong>${escapeHTML(r.trade||r.projectType||'General')}</strong></div>
        <div><span>Deadline</span><strong>${escapeHTML(r.deadline||'Flexible')}</strong></div>
      </div>
      <div class="customer-request-details">${escapeHTML(r.details||'No additional details provided.')}</div>
      <div class="customer-request-actions">
        <button class="customer-view-btn" onclick="viewCustomerRequirement('${id}')"><i class="fa-regular fa-eye"></i> View Details</button>
        <button class="customer-bid-btn" onclick="openBidProposal('${id}','${escapeHTML(r.title||'Untitled Project').replace(/'/g,'&#39;')}')"><i class="fa-solid fa-paper-plane"></i> Submit Bid</button>
      </div>
    </article>`;
  }).join('');
  updateCustomerRequirementStats();
}
function updateCustomerRequirementStats(){
  const all=demoDB.requirements||[];
  const open=all.filter(r=>(r.status||'open').toLowerCase()==='open').length;
  const deadlines=all.filter(r=>r.deadline).length;
  const bids=all.reduce((n,r)=>n+Number(r.bidCount||0),0);
  const a=document.getElementById('reqTotalCount'),b=document.getElementById('reqOpenCount'),c=document.getElementById('reqDeadlineCount'),d=document.getElementById('reqBidCount');
  if(a)a.textContent=all.length;if(b)b.textContent=open;if(c)c.textContent=deadlines;if(d)d.textContent=bids;
}
function updateCustomerRequirementBadge(items=demoDB.requirements){
  const badge=document.getElementById('customerRequirementBadge');
  if(badge)badge.textContent=(items||[]).filter(r=>(r.status||'open').toLowerCase()==='open').length;
}
function viewCustomerRequirement(id){
  const r=(demoDB.requirements||[]).find(x=>String(x.id)===String(id));
  if(!r)return;
  let modal=document.getElementById('customerRequirementDetailModal');
  if(!modal){
    modal=document.createElement('div');modal.id='customerRequirementDetailModal';modal.className='data-modal';modal.setAttribute('aria-hidden','true');
    modal.innerHTML='<div class="data-modal-card customer-req-detail"><div class="data-modal-head"><h2 id="customerReqDetailTitle">Requirement Details</h2><button class="data-close" type="button" onclick="closeDataModal(\'customerRequirementDetailModal\')">×</button></div><div id="customerReqDetailBody"></div></div>';
    document.body.appendChild(modal);
  }
  document.getElementById('customerReqDetailTitle').textContent=r.title||'Requirement Details';
  document.getElementById('customerReqDetailBody').innerHTML=`<div class="detail-grid"><div class="detail-box"><small>Customer</small><strong>${escapeHTML(r.customerName||'-')}</strong></div><div class="detail-box"><small>Status</small><strong>${escapeHTML(r.status||'open')}</strong></div><div class="detail-box"><small>Location</small><strong>${escapeHTML(r.location||'-')}</strong></div><div class="detail-box"><small>Budget</small><strong>${escapeHTML(r.budget||'Negotiable')}</strong></div><div class="detail-box"><small>Project Type</small><strong>${escapeHTML(r.projectType||'-')}</strong></div><div class="detail-box"><small>Required Trade</small><strong>${escapeHTML(r.trade||'-')}</strong></div><div class="detail-box"><small>Deadline</small><strong>${escapeHTML(r.deadline||'Flexible')}</strong></div><div class="detail-box"><small>Posted</small><strong>${r.createdAt?new Date(r.createdAt).toLocaleDateString():'-'}</strong></div></div><h4 style="font-size:11px;margin:14px 0 7px;color:#24324b">Requirement Details</h4><div class="detail-description">${escapeHTML(r.details||'No additional details provided.')}</div><div class="data-form-actions" style="margin-top:15px"><button class="data-btn secondary" type="button" onclick="closeDataModal('customerRequirementDetailModal')">Close</button><button class="data-btn primary" type="button" onclick="closeDataModal('customerRequirementDetailModal');openBidProposal('${escapeHTML(r.id||'')}','${escapeHTML(r.title||'').replace(/'/g,'&#39;')}')"><i class="fa-solid fa-paper-plane"></i> Submit Bid</button></div>`;
  openDataModal('customerRequirementDetailModal');
}
function escapeHTML(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

function openBidProposal(requirementId,name){
  document.getElementById('bidRequirementId').value=requirementId||'';
  document.getElementById('bidProjectTitle').value=name||'';
  openDataModal('bidProposalModal');
}
async function createBidProposal(e){
  e.preventDefault();
  const payload={requirementId:bidRequirementId.value||null,projectTitle:bidProjectTitle.value,contractorName:bidContractor.value.trim(),amount:bidAmount.value.trim(),timeline:bidTimeline.value.trim(),email:bidEmail.value.trim(),message:bidMessage.value.trim(),status:'under_review',createdAt:new Date().toISOString()};
  const result=await apiRequest('/api/bids',{method:'POST',body:JSON.stringify(payload)});
  if(result){showToast('Bid sent to customer successfully');}
  else {payload.id='BID-'+Date.now();demoDB.bids.unshift(payload);const req=demoDB.requirements.find(r=>String(r.id)===String(payload.requirementId));if(req)req.bidCount=Number(req.bidCount||0)+1;persistDemoDB();showToast('Bid saved in demo mode — backend will route it to the customer');}
  closeDataModal('bidProposalModal');e.target.reset();
}

/* Make existing requirement buttons open the real proposal form instead of a toast. */
const _oldSubmitBid=window.submitBid;
window.submitBid=function(name){
  const item=[...document.querySelectorAll('.requirement-item')].find(x=>(x.dataset.projectName||'')===String(name).toLowerCase());
  openBidProposal(item?.dataset.requirementId||'',name);
};

/* Customer-facing helper: call this after customer login to load only their bids. */
async function loadCustomerBids(customerId){
  const result=await apiRequest('/api/bids/customer/'+encodeURIComponent(customerId));
  return Array.isArray(result)?result:demoDB.bids.filter(b=>b.customerId===customerId||!customerId);
}

/* Contractor-facing helper: load bids received for this contractor. */
async function loadContractorBids(contractorId){
  const result=await apiRequest('/api/bids?contractorId='+encodeURIComponent(contractorId));
  return Array.isArray(result)?result:demoDB.bids;
}


/* FULL GEMINI POST REQUIREMENT LOGIC */

// Initial Model Data as per PDF Guide
let tradesData = [
    {
        trade: "Plumber",
        icon: "🚰",
        desc: "Pipe fitting, drainage & sanitation",
        teamSize: 5,
        duration: 15,
        durationUnit: "Days",
        rateType: "Per Day",
        offerRate: 1200
    },
    {
        trade: "Mason",
        icon: "🧱",
        desc: "Brickwork, plastering & PCC",
        teamSize: 8,
        duration: 30,
        durationUnit: "Days",
        rateType: "Per Day",
        offerRate: 950
    }
];

const availableTradesMeta = {
    "Plumber": { icon: "🚰", desc: "Pipe fitting, drainage & sanitation", defaultRate: 1200 },
    "Electrician": { icon: "⚡", desc: "Concealed wiring, MCB & fittings", defaultRate: 1100 },
    "Mason": { icon: "🧱", desc: "Brickwork, plastering & PCC", defaultRate: 950 },
    "Carpenter": { icon: "🔨", desc: "Formwork, shuttering & doors", defaultRate: 1000 },
    "Painter": { icon: "🎨", desc: "Putty, primer, interior/exterior", defaultRate: 850 },
    "Helper / Labor": { icon: "👷", desc: "Material shifting, mixing, site help", defaultRate: 650 }
};

// Wizard Step Navigation
function goToStep(step) {
    if (step < 1 || step > 5) return;

    // Validate before moving forward
    if (step > 1 && !validateStep(step - 1)) return;

    document.querySelectorAll('.pir-step').forEach(btn => {
        const s = parseInt(btn.getAttribute('data-step'), 10);
        btn.classList.remove('active');
        if (s === step) btn.classList.add('active');
        if (s < step) btn.classList.add('done');
        else btn.classList.remove('done');
    });

    document.querySelectorAll('.pir-pane').forEach((pane, idx) => {
        pane.classList.remove('active');
        if (idx === (step - 1)) pane.classList.add('active');
    });

    if (step === 3) renderConfigTable();
    if (step === 5) populateReview();

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextStep(current) {
    goToStep(current + 1);
}

function prevStep(current) {
    goToStep(current - 1);
}

function validateStep(step) {
    if (step === 1) {
        const name = document.getElementById('p_name').value.trim();
        const loc = document.getElementById('p_loc').value.trim();
        if (!name || !loc) {
            showToast("Please fill Project Name and Location.");
            return false;
        }
    }
    if (step === 2) {
        if (tradesData.length === 0) {
            showToast("Please select at least one trade.");
            return false;
        }
    }
    return true;
}

// Character counter
function updateCharCount(el, targetId) {
    document.getElementById(targetId).innerText = `${el.value.length} / ${el.maxLength} characters`;
}

// Image preview
function previewImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('cover_preview').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// Step 2: Trade selection
function toggleTradeCard(checkbox) {
    const tradeName = checkbox.value;
    const isChecked = checkbox.checked;
    const card = checkbox.closest('.pir-trade');

    if (isChecked) {
        card.classList.add('selected');
        const meta = availableTradesMeta[tradeName] || { icon: "🔧", desc: "General specialized skill", defaultRate: 800 };
        if (!tradesData.some(t => t.trade === tradeName)) {
            tradesData.push({
                trade: tradeName,
                icon: meta.icon,
                desc: meta.desc,
                teamSize: 5,
                duration: 15,
                durationUnit: "Days",
                rateType: "Per Day",
                offerRate: meta.defaultRate
            });
        }
    } else {
        card.classList.remove('selected');
        tradesData = tradesData.filter(t => t.trade !== tradeName);
    }

    syncSummary();
}

function addCustomTrade() {
    const input = document.getElementById('custom_trade_input');
    const customName = input.value.trim();
    if (!customName) {
        showToast("Enter a trade title.");
        return;
    }

    if (tradesData.some(t => t.trade.toLowerCase() === customName.toLowerCase())) {
        showToast("Trade already added!");
        return;
    }

    // Add to tradesData
    tradesData.push({
        trade: customName,
        icon: "🔧",
        desc: "Custom Contractor Specification",
        teamSize: 4,
        duration: 15,
        durationUnit: "Days",
        rateType: "Per Day",
        offerRate: 900
    });

    // Add to Step 2 DOM
    const container = document.getElementById('trade-checkboxes');
    const label = document.createElement('label');
    label.className = 'pir-trade selected';
    label.innerHTML = `
        <input type="checkbox" value="${customName}" checked onchange="toggleTradeCard(this)">
        <div class="pir-trade-icon">🔧</div>
        <div>
            <b>${customName}</b>
            <small>Custom Contractor Specification</small>
        </div>
    `;
    container.appendChild(label);
    input.value = "";
    syncSummary();
    showToast(`Custom trade "${customName}" added!`);
}

// Step 3: Render Configuration Table
function renderConfigTable() {
    const tbody = document.getElementById('config-table-body');
    const emptyState = document.getElementById('config-empty-state');
    tbody.innerHTML = "";

    if (tradesData.length === 0) {
        emptyState.style.display = "block";
        syncSummary();
        return;
    } else {
        emptyState.style.display = "none";
    }

    tradesData.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:18px;">${item.icon}</span>
                    <div>
                        <b>${item.trade}</b>
                        <small>${item.desc}</small>
                    </div>
                </div>
            </td>
            <td>
                <div class="pir-qty">
                    <button type="button" onclick="changeQty(${index}, -1)">-</button>
                    <input type="number" class="pir-qty-input" min="1" value="${item.teamSize}" onchange="updateTradeField(${index}, 'teamSize', this.value)">
                    <button type="button" onclick="changeQty(${index}, 1)">+</button>
                </div>
            </td>
            <td>
                <div class="pir-duration">
                    <input type="number" class="pir-duration-input" min="1" value="${item.duration}" onchange="updateTradeField(${index}, 'duration', this.value)">
                    <select onchange="updateTradeField(${index}, 'durationUnit', this.value)">
                        <option value="Days" ${item.durationUnit === "Days" ? "selected" : ""}>Days</option>
                        <option value="Months" ${item.durationUnit === "Months" ? "selected" : ""}>Months</option>
                    </select>
                </div>
            </td>
            <td>
                <select onchange="updateTradeField(${index}, 'rateType', this.value)">
                    <option value="Per Day" ${item.rateType === "Per Day" ? "selected" : ""}>Per Day</option>
                    <option value="Per Month" ${item.rateType === "Per Month" ? "selected" : ""}>Per Month</option>
                    <option value="Lump Sum" ${item.rateType === "Lump Sum" ? "selected" : ""}>Lump Sum</option>
                </select>
            </td>
            <td>
                <input type="number" value="${item.offerRate}" style="width:90px;" min="0" step="50" oninput="updateTradeField(${index}, 'offerRate', this.value)">
            </td>
            <td>
                <button type="button" class="pir-remove" onclick="removeTrade(${index})">✕</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    syncSummary();
}

function changeQty(index, delta) {
    if (tradesData[index]) {
        let current = parseInt(tradesData[index].teamSize, 10) || 1;
        current += delta;
        if (current < 1) current = 1;
        tradesData[index].teamSize = current;
        renderConfigTable();
    }
}

function updateTradeField(index, field, val) {
    if (tradesData[index]) {
        if (field === 'teamSize' || field === 'duration' || field === 'offerRate') {
            tradesData[index][field] = parseFloat(val) || 0;
        } else {
            tradesData[index][field] = val;
        }
        syncSummary();
    }
}

function removeTrade(index) {
    const removed = tradesData.splice(index, 1)[0];
    // Also uncheck in Step 2 checkboxes
    if (removed) {
        document.querySelectorAll('#trade-checkboxes input[type="checkbox"]').forEach(cb => {
            if (cb.value === removed.trade) {
                cb.checked = false;
                cb.closest('.pir-trade').classList.remove('selected');
            }
        });
    }
    renderConfigTable();
    showToast(`Removed ${removed.trade}`);
}

// Calculation & Sync
function calculateDuration() {
    const s = document.getElementById('p_start').value;
    const e = document.getElementById('p_end').value;
    if (s && e) {
        const start = new Date(s);
        const end = new Date(e);
        const diffTime = end - start;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        if (diffDays > 0) {
            document.getElementById('side_duration').innerText = `${diffDays} Days`;
        } else {
            document.getElementById('side_duration').innerText = `1 Day`;
        }
    }
}

function syncSummary() {
    const pName = document.getElementById('p_name').value.trim() || "Untitled Project";
    const pLoc = document.getElementById('p_loc').value.trim() || "Location not set";

    document.getElementById('side_project_name').innerText = pName;
    document.getElementById('side_location').innerText = pLoc;

    const totalTrades = tradesData.length;
    const totalTeam = tradesData.reduce((sum, item) => sum + (parseInt(item.teamSize, 10) || 0), 0);

    document.getElementById('side_total_trades').innerText = totalTrades;
    document.getElementById('side_total_team').innerText = totalTeam;

    // Calculate Labor Cost
    let totalLabor = 0;
    tradesData.forEach(item => {
        const size = parseFloat(item.teamSize) || 0;
        let dur = parseFloat(item.duration) || 0;
        if (item.durationUnit === "Months") dur = dur * 30; // convert months to days for calculation
        const rate = parseFloat(item.offerRate) || 0;

        if (item.rateType === "Lump Sum") {
            totalLabor += rate * size;
        } else {
            totalLabor += rate * dur * size;
        }
    });

    document.getElementById('side_labor_cost').innerText = `₹${totalLabor.toLocaleString('en-IN')}`;
    calculateTotalCost(totalLabor);
}

function calculateTotalCost(computedLabor) {
    let labor = 0;
    if (typeof computedLabor === 'number') {
        labor = computedLabor;
    } else {
        const text = document.getElementById('side_labor_cost').innerText.replace(/[₹,]/g, '');
        labor = parseFloat(text) || 0;
    }

    const material = parseFloat(document.getElementById('side_material_cost').value) || 0;
    const total = labor + material;
    document.getElementById('side_total_cost').innerText = `₹${total.toLocaleString('en-IN')}`;
}

// Step 5: Populate Review Pane
function populateReview() {
    document.getElementById('rev_name').innerText = document.getElementById('p_name').value;
    document.getElementById('rev_type_loc').innerText = `${document.getElementById('p_type').value} | ${document.getElementById('p_loc').value}`;
    document.getElementById('rev_timeline').innerText = `${document.getElementById('p_start').value} to ${document.getElementById('p_end').value}`;
    document.getElementById('rev_need_by').innerText = document.getElementById('s_need_by').value;
    document.getElementById('rev_priority_vis').innerText = `${document.getElementById('s_priority').value} | ${document.getElementById('s_visibility').value}`;
    document.getElementById('rev_req_type').innerText = document.getElementById('s_req_type').value;
    document.getElementById('rev_notes').innerText = document.getElementById('s_notes').value || "None provided";

    const tbody = document.getElementById('rev_table_body');
    tbody.innerHTML = "";

    tradesData.forEach(item => {
        const size = parseFloat(item.teamSize) || 0;
        let dur = parseFloat(item.duration) || 0;
        let days = dur;
        if (item.durationUnit === "Months") days = dur * 30;
        const rate = parseFloat(item.offerRate) || 0;
        const subtotal = (item.rateType === "Lump Sum") ? (rate * size) : (rate * days * size);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><b>${item.trade}</b></td>
            <td>${item.teamSize} Workers</td>
            <td>${item.duration} ${item.durationUnit}</td>
            <td>${item.rateType}</td>
            <td>₹${rate.toLocaleString('en-IN')}</td>
            <td><b>₹${subtotal.toLocaleString('en-IN')}</b></td>
        `;
        tbody.appendChild(tr);
    });
}

// Step 5 Actions: Submit Payload (PDF spec)
function submitRequirement() {
    const labor = parseFloat(document.getElementById('side_labor_cost').innerText.replace(/[₹,]/g, '')) || 0;
    const material = parseFloat(document.getElementById('side_material_cost').value) || 0;
    const totalCost = labor + material;

    const payload = {
        projectDetails: {
            projectName: document.getElementById('p_name').value,
            projectType: document.getElementById('p_type').value,
            location: document.getElementById('p_loc').value,
            startDate: document.getElementById('p_start').value,
            endDate: document.getElementById('p_end').value,
            description: document.getElementById('p_desc').value
        },
        tradesRequired: tradesData.map(t => ({
            trade: t.trade,
            teamSize: t.teamSize,
            duration: t.duration,
            durationUnit: t.durationUnit,
            rateType: t.rateType,
            offerRate: t.offerRate
        })),
        settings: {
            priorityLevel: document.getElementById('s_priority').value,
            requirementType: document.getElementById('s_req_type').value,
            visibility: document.getElementById('s_visibility').value,
            needByDate: document.getElementById('s_need_by').value,
            instructions: document.getElementById('s_notes').value
        },
        estimatedCosts: {
            laborCost: labor,
            materialCost: material,
            totalEstimatedCost: totalCost
        }
    };

    console.log("Java Spring Boot JSON Payload Submitted:", JSON.stringify(payload, null, 2));
    showToast("Requirement Posted to Backend Successfully!");
}

function saveDraft() {
    showToast("Requirement Draft saved locally!");
}

function resetForm() {
    if (confirm("Reset the entire form?")) {
        window.location.reload();
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3200);
}

// Initialise
window.addEventListener('DOMContentLoaded', () => {
    calculateDuration();
    renderConfigTable();
    syncSummary();
});