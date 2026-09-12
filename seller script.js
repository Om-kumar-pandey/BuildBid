/* ==========================================================================
   BuildBid - Seller Dashboard Data & Modular Routing
   ========================================================================== */

// --- DUMMY DATA STATE ---
const dashboardData = {
  rfqs: [
    { id: 1, contractor: "Aman Construction", location: "Gomti Nagar, Lucknow", materials: "UltraTech Cement - 400 Bags, TMT 12mm - 3 Tons", deadline: "25 Sep 2026", status: "New" },
    { id: 2, contractor: "R.K. Builders", location: "Indira Nagar, Lucknow", materials: "Ambuja Cement - 300 Bags, Sand - 20 CFT", deadline: "27 Sep 2026", status: "Quoted" },
    { id: 3, contractor: "Skyline Infra", location: "Sultanpur Road, Lucknow", materials: "Tata Tiscon 10mm - 5 Tons, Bricks - 5000 Nos", deadline: "28 Sep 2026", status: "New" },
    { id: 4, contractor: "Verma Constructions", location: "Alambagh, Lucknow", materials: "OPC 53 Cement - 200 Bags, Aggregate - 40 CFT", deadline: "30 Sep 2026", status: "Negotiation" },
    { id: 5, contractor: "Laxmi Developers", location: "Hazratganj, Lucknow", materials: "Kamdhenu TMT 16mm - 10 Tons", deadline: "02 Oct 2026", status: "New" },
    { id: 6, contractor: "Shine Infratech", location: "Faizabad Road, Lucknow", materials: "Red Clay Bricks - 15,000 Nos", deadline: "05 Oct 2026", status: "Quoted" }
  ],
  inventory: [
    { id: 1, product: "OPC Cement", category: "Cement", brand: "UltraTech", spec: "OPC 53", unit: "Bag", stock: 2500, price: 420 },
    { id: 2, product: "TMT Steel", category: "Steel", brand: "Tata Tiscon", spec: "Fe-550D", unit: "MT", stock: 12, price: 58000 },
    { id: 3, product: "Bricks (Red)", category: "Bricks", brand: "Local", spec: "Standard", unit: "Nos", stock: 20000, price: 8 },
    { id: 4, product: "River Sand", category: "Aggregates", brand: "Local", spec: "Fine", unit: "CFT", stock: 500, price: 65 },
    { id: 5, product: "Coarse Aggregate", category: "Aggregates", brand: "Local", spec: "20mm", unit: "CFT", stock: 800, price: 72 },
    { id: 6, product: "PPC Cement", category: "Cement", brand: "Ambuja", spec: "WeatherShield", unit: "Bag", stock: 1100, price: 395 }
  ],
  orders: [
    { id: 1, orderId: "BB-ORD-1021", contractor: "Aman Construction", location: "Gomti Nagar", amount: "1,82,000", payment: "100% Advance", status: "Pending" },
    { id: 2, orderId: "BB-ORD-1019", contractor: "R.K. Builders", location: "Indira Nagar", amount: "2,48,500", payment: "15-Day Credit", status: "Loading" },
    { id: 3, orderId: "BB-ORD-1017", contractor: "Skyline Infra", location: "Sultanpur Road", amount: "3,12,000", payment: "Pay on Delivery", status: "Dispatched" },
    { id: 4, orderId: "BB-ORD-1015", contractor: "Verma Constructions", location: "Alambagh", amount: "98,500", payment: "100% Advance", status: "Delivered" },
    { id: 5, orderId: "BB-ORD-1012", contractor: "Kuber Homes", location: "Vrindavan Yojna", amount: "4,60,000", payment: "30-Day Credit", status: "Delivered" }
  ],
  invoices: [
    { no: "INV-2026-001", client: "Aman Construction", taxable: "1,54,237", gst: "27,763", total: "1,82,000", status: "Paid" },
    { no: "INV-2026-002", client: "R.K. Builders", taxable: "2,10,593", gst: "37,907", total: "2,48,500", status: "Pending" },
    { no: "INV-2026-003", client: "Skyline Infra", taxable: "2,64,407", gst: "47,593", total: "3,12,000", status: "Overdue" },
    { no: "INV-2026-004", client: "Verma Constructions", taxable: "83,475", gst: "15,025", total: "98,500", status: "Paid" }
  ],
  logistics: {
    orderId: "BB-ORD-1019",
    client: "R.K. Builders - Indira Nagar, Lucknow",
    vehicle: "UP 32 AB 1234",
    driver: "Ramesh Yadav",
    phone: "+91 91234 56789",
    eway: "7412 5569 7788",
    status: "Out for Delivery",
    eta: "22 Sep 2026, 5:00 PM"
  }
};

// --- ROUTER VIEW SWITCHER ---
function switchView(viewName, element) {
  if (element) {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    element.classList.add('active');
  }

  const container = document.getElementById('viewContainer');
  if (!container) return;

  switch (viewName) {
    case 'dashboard':
      container.innerHTML = renderDashboardView();
      break;
    case 'rfq':
      container.innerHTML = renderRfqDetailView();
      break;
    case 'inventory':
      container.innerHTML = renderInventoryDetailView();
      break;
    case 'orders':
      container.innerHTML = renderOrdersDetailView();
      break;
    case 'logistics':
      container.innerHTML = renderLogisticsDetailView();
      break;
    case 'invoices':
      container.innerHTML = renderInvoicesDetailView();
      break;
    case 'customers':
      container.innerHTML = renderPlaceholderView('Customers & Contractor Network', 'fa-users');
      break;
    case 'analytics':
      container.innerHTML = renderPlaceholderView('Business Analytics & Performance Report', 'fa-chart-line');
      break;
    case 'messages':
      container.innerHTML = renderPlaceholderView('Contractor Chats & Negotiation Inbox', 'fa-envelope');
      break;
    case 'settings':
      container.innerHTML = renderPlaceholderView('Business Profile & Verification Settings', 'fa-gear');
      break;
    default:
      container.innerHTML = renderDashboardView();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================================================
// 1. DASHBOARD OVERVIEW VIEW (HOME)
// ==========================================================================
function renderDashboardView() {
  return `
    <!-- 1. HERO BANNER -->
    <section class="seller-hero-card">
      <div class="depot-img-box">
        <div class="depot-img-overlay">
          <h4>SHREE BALAJI</h4>
          <p>BUILDING MATERIALS & STEELS</p>
          <small style="font-size:0.55rem; color:#f8fafc">निर्माण का मजबूत साथी</small>
        </div>
      </div>

      <div class="hero-center">
        <h2>Shree Balaji Building Materials & Steels <span class="gstin-tag"><i class="fa-solid fa-circle-check"></i> GSTIN Verified</span></h2>
        <p class="hero-sub">Cement | TMT Steel | Aggregates | Bricks | MEP Supplies<br>Wholesale <span class="hl">Dealer & Authorized Distributor</span></p>
        <div class="hero-meta-row">
          <div><i class="fa-solid fa-location-dot"></i> Lucknow, Uttar Pradesh</div>
          <div><i class="fa-solid fa-truck"></i> Serviceable up to 35 km</div>
          <div class="star-rating"><i class="fa-solid fa-star" style="color:var(--amber)"></i> <b>4.8</b> (128 reviews)</div>
          <div><i class="fa-solid fa-phone"></i> +91 98765 43210</div>
          <div><i class="fa-solid fa-envelope"></i> balajimaterials@gmail.com</div>
          <div><i class="fa-solid fa-clock"></i> Mon - Sat (8:00 AM - 8:00 PM)</div>
        </div>
      </div>

      <div class="hero-right">
        <div class="tagline-quote">"Quality Materials<br>for a Stronger Tomorrow"</div>
        <button class="btn-edit" onclick="switchView('settings')"><i class="fa-solid fa-pen"></i> Edit Profile</button>
      </div>
    </section>

    <!-- 2. KPI METRICS -->
    <section class="kpi-grid">
      <div class="kpi-card" onclick="switchView('rfq')" style="cursor:pointer">
        <div class="kpi-left">
          <div class="kpi-icon c-blue"><i class="fa-regular fa-file-lines"></i></div>
          <div class="kpi-data">
            <h3>12</h3>
            <p>New RFQs</p>
            <small style="color:#16a34a">+3 today</small>
          </div>
        </div>
        <i class="fa-solid fa-arrow-trend-up" style="color:#0284c7"></i>
      </div>

      <div class="kpi-card" onclick="switchView('orders')" style="cursor:pointer">
        <div class="kpi-left">
          <div class="kpi-icon c-green"><i class="fa-solid fa-cart-shopping"></i></div>
          <div class="kpi-data">
            <h3>8</h3>
            <p>Active Orders</p>
            <small style="color:#16a34a">+2 this week</small>
          </div>
        </div>
        <i class="fa-solid fa-chart-simple" style="color:#16a34a"></i>
      </div>

      <div class="kpi-card" onclick="switchView('logistics')" style="cursor:pointer">
        <div class="kpi-left">
          <div class="kpi-icon c-amber"><i class="fa-solid fa-truck"></i></div>
          <div class="kpi-data">
            <h3>5</h3>
            <p>Dispatched / In-Transit</p>
            <small style="color:#0284c7">3 arriving today</small>
          </div>
        </div>
        <i class="fa-solid fa-chart-line" style="color:#d97706"></i>
      </div>

      <div class="kpi-card" onclick="switchView('invoices')" style="cursor:pointer">
        <div class="kpi-left">
          <div class="kpi-icon c-purple"><i class="fa-solid fa-indian-rupee-sign"></i></div>
          <div class="kpi-data">
            <h3>₹ 12,48,500</h3>
            <p>Total Revenue (This Month)</p>
            <small style="color:#16a34a">+18% vs last month</small>
          </div>
        </div>
        <i class="fa-solid fa-chart-column" style="color:#9333ea"></i>
      </div>

      <div class="kpi-card" onclick="switchView('inventory')" style="cursor:pointer">
        <div class="kpi-left">
          <div class="kpi-icon c-red"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <div class="kpi-data">
            <h3>4</h3>
            <p>Low Stock Alerts</p>
            <small style="color:#dc2626">Action required</small>
          </div>
        </div>
        <i class="fa-solid fa-triangle-exclamation" style="color:#dc2626"></i>
      </div>
    </section>

    <!-- 3. RFQS & PRODUCT INVENTORY MINI WIDGETS -->
    <section class="two-col-grid">
      <div class="dashboard-card">
        <div class="card-head">
          <h3>Incoming RFQs / Enquiries</h3>
          <a class="view-all" onclick="switchView('rfq')">View All</a>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Contractor</th>
                <th>Site Location</th>
                <th>Required Materials</th>
                <th>Needed By</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${dashboardData.rfqs.slice(0, 4).map(r => `
                <tr>
                  <td>${r.id}</td>
                  <td><b>${r.contractor}</b></td>
                  <td>${r.location}</td>
                  <td>${r.materials}</td>
                  <td>${r.deadline}</td>
                  <td><span class="tag ${r.status.toLowerCase()}">${r.status}</span></td>
                  <td>
                    ${r.status === 'New' 
                      ? `<button class="btn-action" onclick="openQuoteFor('${r.contractor}', '${r.materials}')">Send Quote</button>`
                      : `<button class="btn-action outline" onclick="switchView('rfq')">View</button>`
                    }
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="dashboard-card">
        <div class="card-head">
          <h3>Product Inventory</h3>
          <a class="view-all" onclick="switchView('inventory')">View All</a>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Category</th>
                <th>Brand</th>
                <th>Spec / Grade</th>
                <th>Unit</th>
                <th>Stock</th>
                <th>Price (₹)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${dashboardData.inventory.slice(0, 5).map(p => `
                <tr>
                  <td>${p.id}</td>
                  <td><b>${p.product}</b></td>
                  <td>${p.category}</td>
                  <td>${p.brand}</td>
                  <td>${p.spec}</td>
                  <td>${p.unit}</td>
                  <td>${p.stock.toLocaleString()}</td>
                  <td>${p.price.toLocaleString()}</td>
                  <td><button class="btn-action edit-btn" onclick="openProductEdit(${p.id})"><i class="fa-solid fa-pen"></i> Edit</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- 4. ORDERS, LOGISTICS & GST INVOICES WIDGETS -->
    <section class="three-col-grid">
      <div class="dashboard-card">
        <div class="card-head">
          <h3>Orders & Fulfillment</h3>
          <a class="view-all" onclick="switchView('orders')">View All</a>
        </div>
        <div class="filter-tabs">
          <button class="active">All Orders (24)</button>
          <button>Pending (6)</button>
          <button>Dispatched (8)</button>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Order ID</th>
                <th>Contractor</th>
                <th>Amount (₹)</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${dashboardData.orders.slice(0, 4).map(o => `
                <tr>
                  <td>${o.id}</td>
                  <td><b>${o.orderId}</b></td>
                  <td>${o.contractor}</td>
                  <td>${o.amount}</td>
                  <td><span class="tag ${o.status.toLowerCase()}">${o.status}</span></td>
                  <td><button class="btn-action outline" onclick="openStatusFor('${o.orderId}')">Update</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="dashboard-card">
        <div class="card-head">
          <h3>Logistics & Dispatch</h3>
          <a class="view-all" onclick="switchView('logistics')">View All</a>
        </div>
        <div class="dispatch-header">
          <div class="driver-avatar"><i class="fa-solid fa-user"></i></div>
          <div class="dispatch-details">
            <h4>${dashboardData.logistics.orderId}</h4>
            <p>${dashboardData.logistics.client}</p>
          </div>
        </div>
        <div class="logistics-meta-grid">
          <div><span>Vehicle No.</span><b>${dashboardData.logistics.vehicle}</b></div>
          <div><span>Driver Name</span><b>${dashboardData.logistics.driver}</b></div>
          <div><span>Driver Phone</span><b>${dashboardData.logistics.phone}</b></div>
          <div><span>E-Way Bill No.</span><b>${dashboardData.logistics.eway}</b></div>
        </div>
        <div class="tracking-timeline">
          <div class="timeline-step done"><div class="step-circle"><i class="fa-solid fa-check"></i></div><span>Order Confirmed</span></div>
          <div class="timeline-step done"><div class="step-circle"><i class="fa-solid fa-box"></i></div><span>Loaded at Warehouse</span></div>
          <div class="timeline-step active"><div class="step-circle"><i class="fa-solid fa-truck-fast"></i></div><span>Out for Delivery</span></div>
          <div class="timeline-step"><div class="step-circle"><i class="fa-solid fa-location-dot"></i></div><span>Arrived at Site</span></div>
          <div class="timeline-step"><div class="step-circle"><i class="fa-solid fa-house-circle-check"></i></div><span>Unloaded</span></div>
        </div>
        <div class="logistics-footer">
          <div>Current Status: <b>${dashboardData.logistics.status}</b></div>
          <div>Expected: <b>${dashboardData.logistics.eta}</b></div>
        </div>
      </div>

      <div class="dashboard-card">
        <div class="card-head">
          <h3>GST Invoices & Payments</h3>
          <a class="view-all" onclick="switchView('invoices')">View All</a>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th>Client Name</th>
                <th>Total (₹)</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${dashboardData.invoices.map(inv => `
                <tr>
                  <td><b>${inv.no}</b></td>
                  <td>${inv.client}</td>
                  <td><b>${inv.total}</b></td>
                  <td><span class="tag ${inv.status.toLowerCase()}">${inv.status}</span></td>
                  <td><button class="btn-action outline" onclick="alert('Downloading ${inv.no}')"><i class="fa-solid fa-download"></i></button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

// ==========================================================================
// 2. RFQ & QUOTES DETAIL VIEW
// ==========================================================================
function renderRfqDetailView() {
  return `
    <div class="detail-view-header">
      <div>
        <h2>RFQ & Quotations Management</h2>
        <p>Manage real-time material requirements from local building contractors.</p>
      </div>
      <button class="btn-action" onclick="openModal('quoteModal')"><i class="fa-solid fa-paper-plane"></i> Send Quotation</button>
    </div>

    <div class="dashboard-card">
      <div class="detail-controls-bar">
        <div class="filter-tabs">
          <button class="active" onclick="filterRfqTable('all', this)">All Requests (${dashboardData.rfqs.length})</button>
          <button onclick="filterRfqTable('New', this)">New Quotes</button>
          <button onclick="filterRfqTable('Quoted', this)">Quoted</button>
          <button onclick="filterRfqTable('Negotiation', this)">In Negotiation</button>
        </div>
        <div class="search-box-detail">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" placeholder="Search by contractor or location..." oninput="searchRfqTable(this.value)">
        </div>
      </div>

      <div class="table-wrapper">
        <table id="rfqDetailTable">
          <thead>
            <tr>
              <th>#</th>
              <th>Contractor Name</th>
              <th>Site Address</th>
              <th>Required Materials</th>
              <th>Needed By Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${dashboardData.rfqs.map(r => `
              <tr data-status="${r.status}">
                <td>${r.id}</td>
                <td><b>${r.contractor}</b></td>
                <td>${r.location}</td>
                <td>${r.materials}</td>
                <td>${r.deadline}</td>
                <td><span class="tag ${r.status.toLowerCase()}">${r.status}</span></td>
                <td>
                  <button class="btn-action" onclick="openQuoteFor('${r.contractor}', '${r.materials}')">Submit Quote</button>
                  <button class="btn-action outline" onclick="alert('Viewing specs for ${r.contractor}')">Details</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ==========================================================================
// 3. PRODUCTS & INVENTORY DETAIL VIEW
// ==========================================================================
function renderInventoryDetailView() {
  return `
    <div class="detail-view-header">
      <div>
        <h2>Products & Material Inventory Catalog</h2>
        <p>Monitor warehouse stock, update base pricing, and configure MOQ parameters.</p>
      </div>
      <button class="btn-action" onclick="openModal('productModal')"><i class="fa-solid fa-plus"></i> Add New Material</button>
    </div>

    <div class="dashboard-card">
      <div class="detail-controls-bar">
        <div class="filter-tabs">
          <button class="active" onclick="filterInventoryTable('all', this)">All Materials (${dashboardData.inventory.length})</button>
          <button onclick="filterInventoryTable('Cement', this)">Cement</button>
          <button onclick="filterInventoryTable('Steel', this)">TMT Steel</button>
          <button onclick="filterInventoryTable('Bricks', this)">Bricks</button>
          <button onclick="filterInventoryTable('Aggregates', this)">Aggregates</button>
        </div>
        <div class="search-box-detail">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" placeholder="Search catalog..." oninput="searchInventoryTable(this.value)">
        </div>
      </div>

      <div class="table-wrapper">
        <table id="inventoryDetailTable">
          <thead>
            <tr>
              <th>ID</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Brand</th>
              <th>Specification</th>
              <th>Unit</th>
              <th>In-Stock Qty</th>
              <th>Base Rate (₹)</th>
              <th>Stock Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${dashboardData.inventory.map(p => `
              <tr data-cat="${p.category}">
                <td>${p.id}</td>
                <td><b>${p.product}</b></td>
                <td>${p.category}</td>
                <td>${p.brand}</td>
                <td>${p.spec}</td>
                <td>${p.unit}</td>
                <td><b>${p.stock.toLocaleString()}</b></td>
                <td>₹ ${p.price.toLocaleString()}</td>
                <td><span class="tag ${p.stock < 1000 ? 'overdue' : 'paid'}">${p.stock < 1000 ? 'Low Stock' : 'Sufficient'}</span></td>
                <td><button class="btn-action edit-btn" onclick="openProductEdit(${p.id})"><i class="fa-solid fa-pen"></i> Update</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ==========================================================================
// 4. ORDERS & FULFILLMENT DETAIL VIEW
// ==========================================================================
function renderOrdersDetailView() {
  return `
    <div class="detail-view-header">
      <div>
        <h2>Orders & Delivery Fulfillment Pipeline</h2>
        <p>Review incoming orders, assign dispatch trucks, and verify site deliveries.</p>
      </div>
      <button class="btn-action" onclick="alert('Exporting manifest...')"><i class="fa-solid fa-file-excel"></i> Export Orders</button>
    </div>

    <div class="dashboard-card">
      <div class="detail-controls-bar">
        <div class="filter-tabs">
          <button class="active" onclick="filterOrderTable('all', this)">All Orders (${dashboardData.orders.length})</button>
          <button onclick="filterOrderTable('Pending', this)">Pending Confirmation</button>
          <button onclick="filterOrderTable('Loading', this)">Loading Depot</button>
          <button onclick="filterOrderTable('Dispatched', this)">Dispatched</button>
          <button onclick="filterOrderTable('Delivered', this)">Delivered</button>
        </div>
        <div class="search-box-detail">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" placeholder="Search orders..." oninput="searchOrdersTable(this.value)">
        </div>
      </div>

      <div class="table-wrapper">
        <table id="ordersDetailTable">
          <thead>
            <tr>
              <th>#</th>
              <th>Order ID</th>
              <th>Contractor Name</th>
              <th>Delivery Site</th>
              <th>Total Amount (₹)</th>
              <th>Payment Terms</th>
              <th>Fulfillment Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${dashboardData.orders.map(o => `
              <tr data-status="${o.status}">
                <td>${o.id}</td>
                <td><b>${o.orderId}</b></td>
                <td>${o.contractor}</td>
                <td>${o.location}</td>
                <td><b>₹ ${o.amount}</b></td>
                <td><span class="tag paid">${o.payment}</span></td>
                <td><span class="tag ${o.status.toLowerCase()}">${o.status}</span></td>
                <td>
                  <button class="btn-action" onclick="openStatusFor('${o.orderId}')">Status</button>
                  <button class="btn-action outline" onclick="alert('Printing Delivery Challan for ${o.orderId}')"><i class="fa-solid fa-print"></i></button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ==========================================================================
// 5. LOGISTICS & FLEET DETAIL VIEW
// ==========================================================================
function renderLogisticsDetailView() {
  return `
    <div class="detail-view-header">
      <div>
        <h2>Logistics, Fleet & Trip Dispatch Tracking</h2>
        <p>Monitor live vehicle movements, driver contact records, and E-Way bills.</p>
      </div>
      <button class="btn-action" onclick="openStatusFor('BB-ORD-1019')"><i class="fa-solid fa-location-arrow"></i> Update Trip Status</button>
    </div>

    <div class="dashboard-card">
      <div class="card-head">
        <h3>Live Consignment: ${dashboardData.logistics.orderId}</h3>
        <span class="tag dispatched">In-Transit</span>
      </div>

      <div class="dispatch-header">
        <div class="driver-avatar"><i class="fa-solid fa-user"></i></div>
        <div class="dispatch-details">
          <h4>${dashboardData.logistics.driver} &bull; ${dashboardData.logistics.phone}</h4>
          <p>Consigned to: ${dashboardData.logistics.client}</p>
        </div>
      </div>

      <div class="logistics-meta-grid" style="grid-template-columns: repeat(4, 1fr); margin:10px 0;">
        <div><span>Assigned Vehicle</span><b>${dashboardData.logistics.vehicle}</b></div>
        <div><span>Government E-Way Bill</span><b>${dashboardData.logistics.eway}</b></div>
        <div><span>Estimated Time of Arrival</span><b>${dashboardData.logistics.eta}</b></div>
        <div><span>Warehouse Loading Point</span><b>Lucknow Central Depot</b></div>
      </div>

      <div class="tracking-timeline" style="margin: 2rem 1rem;">
        <div class="timeline-step done"><div class="step-circle"><i class="fa-solid fa-check"></i></div><span>Order Confirmed</span></div>
        <div class="timeline-step done"><div class="step-circle"><i class="fa-solid fa-box"></i></div><span>Loaded at Warehouse</span></div>
        <div class="timeline-step active"><div class="step-circle"><i class="fa-solid fa-truck-fast"></i></div><span>Out for Delivery</span></div>
        <div class="timeline-step"><div class="step-circle"><i class="fa-solid fa-location-dot"></i></div><span>Arrived at Site</span></div>
        <div class="timeline-step"><div class="step-circle"><i class="fa-solid fa-house-circle-check"></i></div><span>Unloaded & Signed</span></div>
      </div>
    </div>
  `;
}

// ==========================================================================
// 6. GST INVOICES DETAIL VIEW
// ==========================================================================
function renderInvoicesDetailView() {
  return `
    <div class="detail-view-header">
      <div>
        <h2>GST Invoices & Accounts Receivable</h2>
        <p>Track compliance billing, CGST/SGST breakdowns, and client payments.</p>
      </div>
      <button class="btn-action" onclick="alert('Creating new GST Tax Invoice...')"><i class="fa-solid fa-plus"></i> Create Invoice</button>
    </div>

    <div class="dashboard-card">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Invoice Number</th>
              <th>Client / Buyer Name</th>
              <th>Taxable Value (₹)</th>
              <th>GST Amount (18%)</th>
              <th>Gross Total (₹)</th>
              <th>Payment Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${dashboardData.invoices.map(inv => `
              <tr>
                <td><b>${inv.no}</b></td>
                <td>${inv.client}</td>
                <td>₹ ${inv.taxable}</td>
                <td>₹ ${inv.gst}</td>
                <td><b>₹ ${inv.total}</b></td>
                <td><span class="tag ${inv.status.toLowerCase()}">${inv.status}</span></td>
                <td>
                  <button class="btn-action outline" onclick="alert('Downloading PDF for ${inv.no}')"><i class="fa-solid fa-download"></i> PDF</button>
                  <button class="btn-action" onclick="alert('Payment receipt generated for ${inv.client}')">Receipt</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ==========================================================================
// 7. PLACEHOLDER VIEW FOR REMAINING TABS
// ==========================================================================
function renderPlaceholderView(title, iconClass) {
  return `
    <div class="dashboard-card" style="text-align:center; padding: 4rem 1rem;">
      <i class="fa-solid ${iconClass}" style="font-size:3rem; color:var(--primary-blue); margin-bottom:12px;"></i>
      <h2>${title}</h2>
      <p style="color:var(--text-muted); font-size:0.85rem; margin-top:6px;">This module is configured and ready for live database integration.</p>
      <button class="btn-action" style="margin-top:15px;" onclick="switchView('dashboard')">Return to Dashboard Home</button>
    </div>
  `;
}

// ==========================================================================
// MODAL & FORM CONTROLS
// ==========================================================================
function openModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.add('active');
}

function closeModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.remove('active');
}

function openQuoteFor(contractor, materials) {
  const inputMsg = document.getElementById('quoteMessage');
  if (inputMsg) inputMsg.value = `Quotation prepared for ${contractor}: ${materials}`;
  openModal('quoteModal');
}

function openStatusFor(orderId) {
  const orderInput = document.getElementById('statusOrderId');
  if (orderInput) orderInput.value = orderId;
  openModal('statusModal');
}

function openProductEdit(id) {
  const item = dashboardData.inventory.find(x => x.id === id);
  if (!item) return;
  document.getElementById('newProdName').value = item.product;
  document.getElementById('newProdCategory').value = item.category;
  document.getElementById('newProdBrand').value = item.brand;
  document.getElementById('newProdSpec').value = item.spec;
  document.getElementById('newProdPrice').value = item.price;
  document.getElementById('newProdStock').value = item.stock;
  openModal('productModal');
}

function handleSendQuote(e) {
  e.preventDefault();
  alert('Quotation submitted successfully to contractor!');
  closeModal('quoteModal');
}

function handleAddProduct(e) {
  e.preventDefault();
  const name = document.getElementById('newProdName').value;
  const cat = document.getElementById('newProdCategory').value;
  const brand = document.getElementById('newProdBrand').value;
  const spec = document.getElementById('newProdSpec').value;
  const unit = document.getElementById('newProdUnit').value;
  const price = Number(document.getElementById('newProdPrice').value) || 0;
  const stock = Number(document.getElementById('newProdStock').value) || 0;

  dashboardData.inventory.unshift({
    id: dashboardData.inventory.length + 1,
    product: name,
    category: cat,
    brand: brand,
    spec: spec,
    unit: unit,
    stock: stock,
    price: price
  });

  alert(`Product "${name}" added to inventory catalog!`);
  closeModal('productModal');
  switchView('inventory');
}

function handleUpdateStatus(e) {
  e.preventDefault();
  const orderId = document.getElementById('statusOrderId').value;
  const status = document.getElementById('statusSelect').value;
  const order = dashboardData.orders.find(o => o.orderId === orderId);
  if (order) order.status = status;
  dashboardData.logistics.status = status;

  alert(`Order ${orderId} updated to status: "${status}"!`);
  closeModal('statusModal');
  switchView('logistics');
}

// Table Filtering Helpers
function filterRfqTable(status, btn) {
  document.querySelectorAll('.filter-tabs button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#rfqDetailTable tbody tr').forEach(row => {
    row.style.display = (status === 'all' || row.dataset.status === status) ? '' : 'none';
  });
}

function searchRfqTable(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('#rfqDetailTable tbody tr').forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(q) ? '' : 'none';
  });
}

function filterInventoryTable(cat, btn) {
  document.querySelectorAll('.filter-tabs button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#inventoryDetailTable tbody tr').forEach(row => {
    row.style.display = (cat === 'all' || row.dataset.cat === cat) ? '' : 'none';
  });
}

function searchInventoryTable(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('#inventoryDetailTable tbody tr').forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(q) ? '' : 'none';
  });
}

function filterOrderTable(status, btn) {
  document.querySelectorAll('.filter-tabs button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#ordersDetailTable tbody tr').forEach(row => {
    row.style.display = (status === 'all' || row.dataset.status === status) ? '' : 'none';
  });
}

function searchOrdersTable(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('#ordersDetailTable tbody tr').forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(q) ? '' : 'none';
  });
}

function handleGlobalSearch(query) {
  const q = query.toLowerCase().trim();
  if (!q) return;
  if (q.includes('quote') || q.includes('rfq')) switchView('rfq');
  else if (q.includes('cement') || q.includes('steel') || q.includes('brick') || q.includes('sand')) switchView('inventory');
  else if (q.includes('order') || q.includes('ord-')) switchView('orders');
  else if (q.includes('truck') || q.includes('dispatch') || q.includes('eway')) switchView('logistics');
  else if (q.includes('inv') || q.includes('tax') || q.includes('gst')) switchView('invoices');
}

function toggleNotifications() {
  alert('You have 5 unread alerts:\n1. 3 new RFQs received today\n2. Order BB-ORD-1019 is arriving at site\n3. Low stock warning for Red Clay Bricks');
}

// Initial Launch
window.addEventListener('DOMContentLoaded', () => {
  switchView('dashboard');
});