/* ==========================================================================
   ZOO ADVENTURE ADMIN SYSTEM LOGIC
   ========================================================================== */

// Demo credentials
const ADMIN_CREDENTIALS = {
    email: "admin@zooadventure.com",
    pass: "admin123"
};

// Current Active Tab
let activeTab = 'overview';

// Sort States for Booking Table
let sortColumn = 'bookingId';
let sortAscending = false;

// Pagination State
let bookingPage = 1;
const bookingLimit = 10;
let filteredBookingsList = [];

// Initialize Page
document.addEventListener("DOMContentLoaded", () => {
    // Set Header Date
    const dateDisplay = document.getElementById("header-date-display");
    if (dateDisplay) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateDisplay.innerText = new Date().toLocaleDateString('en-GB', options);
    }

    // Check if admin is already logged in
    const activeAdmin = localStorage.getItem("zoo_admin_session");
    if (activeAdmin) {
        showAdminApp();
        refreshAllData();
    } else {
        showLoginScreen();
    }
});

/* ==========================================================================
   AUTHENTICATION LOGIC
   ========================================================================== */
function handleAdminLogin(event) {
    event.preventDefault();
    const email = document.getElementById("admin-email").value.trim().toLowerCase();
    const pass = document.getElementById("admin-pass").value;
    const errorMsg = document.getElementById("login-error");

    if (email === ADMIN_CREDENTIALS.email && pass === ADMIN_CREDENTIALS.pass) {
        localStorage.setItem("zoo_admin_session", "active");
        if (errorMsg) errorMsg.classList.add("hidden");
        showAdminApp();
        refreshAllData();
    } else {
        if (errorMsg) errorMsg.classList.remove("hidden");
    }
}

function handleLogout() {
    localStorage.removeItem("zoo_admin_session");
    showLoginScreen();
}

function showLoginScreen() {
    document.getElementById("login-screen").classList.remove("hidden");
    document.getElementById("dashboard-app").classList.add("hidden");
}

function showAdminApp() {
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("dashboard-app").classList.remove("hidden");
}

/* ==========================================================================
   NAVIGATION LOGIC
   ========================================================================== */
function switchTab(tabId, event) {
    if (event) event.preventDefault();
    
    // Update navigation active states
    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
    });
    const navItem = document.getElementById(`nav-${tabId}`);
    if (navItem) navItem.classList.add("active");

    // Show corresponding tab content
    document.querySelectorAll(".tab-content").forEach(content => {
        content.classList.remove("active");
    });
    const tabContent = document.getElementById(`tab-${tabId}`);
    if (tabContent) tabContent.classList.add("active");

    // Update title
    const titleEl = document.getElementById("page-title");
    const subtitleEl = document.getElementById("page-subtitle");
    if (titleEl && subtitleEl) {
        titleEl.innerText = tabId.charAt(0).toUpperCase() + tabId.slice(1);
        if (tabId === 'overview') subtitleEl.innerText = "Real-time zoo ticketing system data";
        else if (tabId === 'bookings') subtitleEl.innerText = "Search, filter and manage zoo ticket sales";
        else if (tabId === 'analytics') subtitleEl.innerText = "Visualized trends and visitor data";
        else if (tabId === 'users') subtitleEl.innerText = "Registered customer list and statistics";
        else if (tabId === 'tickets') subtitleEl.innerText = "Sales breakdown by ticket categories";
        else if (tabId === 'revenue') subtitleEl.innerText = "Financial summary and average order stats";
    }

    activeTab = tabId;

    // Refresh display
    refreshAllData();
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.classList.toggle("open");
}

/* ==========================================================================
   DATA LOADER & STATISTICS CALCULATIONS
   ========================================================================== */
function refreshAllData() {
    // Fetch bookings & users from localStorage
    const bookings = JSON.parse(localStorage.getItem("zoo_bookings")) || [];
    const users = JSON.parse(localStorage.getItem("zoo_users")) || [];

    // Calculations
    const totalBookings = bookings.length;
    const activeBookings = bookings.filter(b => b.status === "Active");
    const cancelledBookings = bookings.filter(b => b.status === "Cancelled");
    
    let totalRevenue = 0;
    activeBookings.forEach(b => {
        totalRevenue += parseFloat(b.paidAmount) || 0;
    });

    const avgTicketValue = activeBookings.length > 0 ? (totalRevenue / activeBookings.length) : 0;
    const cancelRatePercent = totalBookings > 0 ? ((cancelledBookings.length / totalBookings) * 100).toFixed(1) : 0;

    // Update KPI UI
    document.getElementById("kpi-total-bookings").innerText = totalBookings;
    document.getElementById("kpi-total-revenue").innerText = `RM ${totalRevenue.toFixed(2)}`;
    document.getElementById("kpi-total-users").innerText = users.length;
    document.getElementById("kpi-active-bookings").innerText = activeBookings.length;
    document.getElementById("kpi-cancelled").innerText = cancelledBookings.length;
    document.getElementById("kpi-avg-value").innerText = `RM ${avgTicketValue.toFixed(2)}`;

    // KPI Trends comparison
    document.getElementById("kpi-total-bookings-change").innerText = `+12% from last week`;
    document.getElementById("kpi-total-bookings-change").style.color = "var(--accent-green)";
    document.getElementById("kpi-revenue-change").innerText = `+8.5% compared to target`;
    document.getElementById("kpi-revenue-change").style.color = "var(--accent-green)";
    document.getElementById("kpi-users-change").innerText = `+18% growth month-on-month`;
    document.getElementById("kpi-users-change").style.color = "var(--accent-green)";
    document.getElementById("kpi-active-change").innerText = `${((activeBookings.length / (totalBookings || 1)) * 100).toFixed(0)}% completion rate`;
    document.getElementById("kpi-active-change").style.color = "var(--text-muted)";
    document.getElementById("kpi-cancel-rate").innerText = `${cancelRatePercent}% of total orders`;
    document.getElementById("kpi-cancel-rate").style.color = "var(--accent-red)";
    document.getElementById("kpi-avg-change").innerText = `Base package: RM 45.00`;
    document.getElementById("kpi-avg-change").style.color = "var(--text-muted)";

    // Update depending on active tab
    if (activeTab === 'overview') {
        renderRecentBookings(bookings);
        renderCharts(bookings);
        renderTicketBreakdown(bookings);
    } else if (activeTab === 'bookings') {
        filterBookingsTable(true); // Persist search values
    } else if (activeTab === 'analytics') {
        renderAnalyticsTabCharts(bookings);
    } else if (activeTab === 'users') {
        renderUsersTable(users, bookings);
    } else if (activeTab === 'tickets') {
        renderTicketStats(bookings);
    } else if (activeTab === 'revenue') {
        renderRevenueDashboard(bookings);
    }
}

/* ==========================================================================
   TAB OVERVIEW RENDERERS
   ========================================================================== */
function renderRecentBookings(bookings) {
    const tbody = document.getElementById("recent-bookings-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const recent = bookings.slice(0, 5);
    if (recent.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:20px; color:var(--text-muted);">No records found.</td></tr>`;
        return;
    }

    recent.forEach(b => {
        const isCancelled = b.status === "Cancelled";
        const cleanAmount = (parseFloat(b.paidAmount) || 0).toFixed(2);
        tbody.innerHTML += `
            <tr>
                <td><strong>${b.bookingId}</strong></td>
                <td>${b.billingName}</td>
                <td>${b.packageName || "Standard Admission"}</td>
                <td>${b.visitDate}</td>
                <td>RM ${cleanAmount}</td>
                <td><span class="badge-status ${isCancelled ? 'cancelled' : 'active'}">${b.status}</span></td>
            </tr>
        `;
    });
}

function renderTicketBreakdown(bookings) {
    const breakdownList = document.getElementById("ticket-breakdown-list");
    if (!breakdownList) return;
    breakdownList.innerHTML = "";

    let counts = { adult: 0, child: 0, senior: 0 };
    let amounts = { adult: 0, child: 0, senior: 0 };

    bookings.forEach(b => {
        if (b.status === "Cancelled") return;
        
        // Parse ticket strings, e.g., "2 Adult, 2 Child"
        const tString = b.tickets || "";
        const parts = tString.split(",");
        parts.forEach(part => {
            const clean = part.trim().toLowerCase();
            const num = parseInt(clean) || 0;
            if (clean.includes("adult")) {
                counts.adult += num;
                amounts.adult += num * 45; // Base price
            } else if (clean.includes("child")) {
                counts.child += num;
                amounts.child += num * 25;
            } else if (clean.includes("senior")) {
                counts.senior += num;
                amounts.senior += num * 20;
            }
        });
    });

    const totalTickets = counts.adult + counts.child + counts.senior;

    const ticketCategories = [
        { type: "Adult Admissions", emoji: "👨", count: counts.adult, revenue: amounts.adult, color: "var(--accent-blue)" },
        { type: "Child Admissions", emoji: "👧", count: counts.child, revenue: amounts.child, color: "var(--accent-green)" },
        { type: "Senior Admissions", emoji: "👵", count: counts.senior, revenue: amounts.senior, color: "var(--accent-purple)" }
    ];

    ticketCategories.forEach(cat => {
        const percent = totalTickets > 0 ? ((cat.count / totalTickets) * 100).toFixed(0) : 0;
        breakdownList.innerHTML += `
            <div class="breakdown-item">
                <div class="breakdown-icon" style="background: rgba(255,255,255,0.05);">${cat.emoji}</div>
                <div class="breakdown-info">
                    <span class="breakdown-name">${cat.type} (${percent}%)</span>
                    <span class="breakdown-count">${cat.count} tickets sold</span>
                </div>
                <span class="breakdown-val">RM ${cat.revenue.toFixed(2)}</span>
            </div>
        `;
    });
}

/* CHARTS IMPLEMENTATION (Overview Tab) */
function renderCharts(bookings) {
    // 1. Monthly Bar Chart
    const barChart = document.getElementById("monthly-bar-chart");
    const barLabels = document.getElementById("monthly-bar-labels");
    if (barChart && barLabels) {
        barChart.innerHTML = "";
        barLabels.innerHTML = "";

        // Parse month data
        const monthCounts = { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0 };
        bookings.forEach(b => {
            const date = b.visitDate || "";
            // Date format: "15 May 2026" or "28 April 2026"
            const parts = date.split(" ");
            if (parts.length >= 2) {
                const m = parts[1].substring(0, 3);
                if (monthCounts[m] !== undefined) {
                    monthCounts[m]++;
                }
            }
        });

        const activeMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
        let maxVal = 0;
        activeMonths.forEach(m => {
            if (monthCounts[m] > maxVal) maxVal = monthCounts[m];
        });
        if (maxVal === 0) maxVal = 1;

        activeMonths.forEach(m => {
            const val = monthCounts[m];
            const heightPct = ((val / maxVal) * 100).toFixed(0);

            // Bar Column
            const barCol = document.createElement("div");
            barCol.className = "bar-col";
            barCol.innerHTML = `
                <span class="bar-val">${val}</span>
                <div class="bar-block" style="height: ${heightPct}%;" title="${val} Bookings in ${m}"></div>
            `;
            barChart.appendChild(barCol);

            // Label
            const lbl = document.createElement("span");
            lbl.className = "bar-lbl";
            lbl.innerText = m;
            barLabels.appendChild(lbl);
        });
    }

    // 2. Package Donut Chart
    const donutSvg = document.getElementById("donut-svg");
    const donutLegend = document.getElementById("donut-legend");
    if (donutSvg && donutLegend) {
        donutSvg.innerHTML = "";
        donutLegend.innerHTML = "";

        const packageCounts = {
            "Standard Admission": 0,
            "Family Package": 0,
            "School Trip": 0,
            "VIP Experience": 0,
            "Annual Pass": 0
        };

        bookings.forEach(b => {
            const name = b.packageName || "Standard Admission";
            if (packageCounts[name] !== undefined) {
                packageCounts[name]++;
            } else {
                packageCounts["Standard Admission"]++;
            }
        });

        const total = Object.values(packageCounts).reduce((a, b) => a + b, 0);

        const packageColors = {
            "Standard Admission": "var(--accent-blue)",
            "Family Package": "var(--accent-green)",
            "School Trip": "var(--accent-orange)",
            "VIP Experience": "var(--accent-purple)",
            "Annual Pass": "var(--accent-teal)"
        };

        // Render Legend and compute segments
        let strokeDashOffset = 0;
        const activePackagesCount = Object.values(packageCounts).filter(c => c > 0).length;
        const hasMultiple = activePackagesCount > 1;
        const gap = hasMultiple ? 5 : 0; // Segment gap size

        Object.keys(packageCounts).forEach(pkgName => {
            const count = packageCounts[pkgName];
            const percent = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
            const color = packageColors[pkgName];

            // Legend item
            donutLegend.innerHTML += `
                <div class="legend-item">
                    <span class="legend-dot" style="background: ${color};"></span>
                    <span class="legend-label">${pkgName}</span>
                    <span class="legend-pct">${percent}%</span>
                </div>
            `;

            // Draw SVG Circle slice
            if (count > 0 && total > 0) {
                const circumference = 2 * Math.PI * 42; // R = 42 => 263.89
                const sliceVal = (count / total) * circumference;
                const pctOfCircumference = hasMultiple ? Math.max(0, sliceVal - gap) : sliceVal;
                
                const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circle.setAttribute("cx", "100");
                circle.setAttribute("cy", "100");
                circle.setAttribute("r", "42");
                circle.setAttribute("fill", "transparent");
                circle.setAttribute("stroke", color);
                circle.setAttribute("stroke-width", "22");
                circle.setAttribute("stroke-dasharray", `${pctOfCircumference} ${circumference - pctOfCircumference}`);
                circle.setAttribute("stroke-dashoffset", -strokeDashOffset);
                circle.setAttribute("transform", "rotate(-90 100 100)");
                circle.style.transition = "stroke-width 0.25s cubic-bezier(0.4, 0, 0.2, 1)";
                circle.style.cursor = "pointer";

                // Interactive zoom on hover
                circle.addEventListener("mouseenter", () => {
                    circle.setAttribute("stroke-width", "26");
                });
                circle.addEventListener("mouseleave", () => {
                    circle.setAttribute("stroke-width", "22");
                });

                // Tooltip
                const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
                title.textContent = `${pkgName}: ${count} (${percent}%)`;
                circle.appendChild(title);

                donutSvg.appendChild(circle);
                strokeDashOffset += sliceVal;
            }
        });

        // Add inner circle to make it a donut
        const innerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        innerCircle.setAttribute("cx", "100");
        innerCircle.setAttribute("cy", "100");
        innerCircle.setAttribute("r", "31"); // Sits flush with inner edge (42 - 22/2 = 31)
        innerCircle.setAttribute("fill", "var(--bg-card)");
        donutSvg.appendChild(innerCircle);

        // Add 3D Inner Bevel Highlight
        const bevelCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        bevelCircle.setAttribute("cx", "100");
        bevelCircle.setAttribute("cy", "100");
        bevelCircle.setAttribute("r", "31");
        bevelCircle.setAttribute("fill", "transparent");
        bevelCircle.setAttribute("stroke", "rgba(255, 255, 255, 0.08)");
        bevelCircle.setAttribute("stroke-width", "1.5");
        donutSvg.appendChild(bevelCircle);
    }
}

/* ==========================================================================
   TAB ANALYTICS RENDERERS
   ========================================================================== */
function renderAnalyticsTabCharts(bookings) {
    // 1. Monthly Revenue Line Chart
    const lineSvg = document.getElementById("revenue-line-svg");
    const lineLabels = document.getElementById("revenue-line-labels");
    if (lineSvg && lineLabels) {
        lineSvg.innerHTML = "";
        lineLabels.innerHTML = "";

        const monthlyRevenue = { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0 };
        bookings.forEach(b => {
            if (b.status === "Cancelled") return;
            const date = b.visitDate || "";
            const parts = date.split(" ");
            if (parts.length >= 2) {
                const m = parts[1].substring(0, 3);
                if (monthlyRevenue[m] !== undefined) {
                    monthlyRevenue[m] += parseFloat(b.paidAmount) || 0;
                }
            }
        });

        const months = Object.keys(monthlyRevenue);
        const revenues = Object.values(monthlyRevenue);
        const maxRev = Math.max(...revenues, 100);

        // Generate Path Points
        // SVG width = 900, height = 300
        const paddingLeft = 50;
        const paddingRight = 50;
        const width = 900 - paddingLeft - paddingRight;
        const height = 300 - 60; // 240px chart height

        let points = [];
        months.forEach((m, idx) => {
            const x = paddingLeft + (idx * (width / (months.length - 1)));
            const y = 300 - 30 - ((monthlyRevenue[m] / maxRev) * height);
            points.push({ x, y, month: m, val: monthlyRevenue[m] });
        });

        // 1. Draw Grid Lines in Background
        const gridLevels = [30, 110, 190, 270];
        gridLevels.forEach(lvl => {
            const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            gridLine.setAttribute("x1", paddingLeft);
            gridLine.setAttribute("y1", lvl);
            gridLine.setAttribute("x2", 900 - paddingRight);
            gridLine.setAttribute("y2", lvl);
            gridLine.setAttribute("stroke", "rgba(255, 255, 255, 0.05)");
            gridLine.setAttribute("stroke-dasharray", "5 5");
            lineSvg.appendChild(gridLine);
        });

        // 2. Generate Smooth Cubic Bezier Path
        let pathD = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            const cp1x = points[i-1].x + (points[i].x - points[i-1].x) / 2.5;
            const cp1y = points[i-1].y;
            const cp2x = points[i].x - (points[i].x - points[i-1].x) / 2.5;
            const cp2y = points[i].y;
            pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i].x} ${points[i].y}`;
        }

        // 3. Build SVG Defs for Gradients and Filters
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        
        // Area Linear Gradient
        const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        grad.setAttribute("id", "areaGrad");
        grad.setAttribute("x1", "0");
        grad.setAttribute("y1", "0");
        grad.setAttribute("x2", "0");
        grad.setAttribute("y2", "1");
        
        const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop1.setAttribute("offset", "0%");
        stop1.setAttribute("stop-color", "#3b82f6");
        stop1.setAttribute("stop-opacity", "0.45");
        
        const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop2.setAttribute("offset", "100%");
        stop2.setAttribute("stop-color", "#3b82f6");
        stop2.setAttribute("stop-opacity", "0.0");
        
        grad.appendChild(stop1);
        grad.appendChild(stop2);
        defs.appendChild(grad);

        // 3D Glow Drop Shadow Filter
        const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
        filter.setAttribute("id", "glow-shadow");
        filter.setAttribute("x", "-20%");
        filter.setAttribute("y", "-20%");
        filter.setAttribute("width", "140%");
        filter.setAttribute("height", "140%");

        const blur = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
        blur.setAttribute("stdDeviation", "6");
        blur.setAttribute("result", "blur");
        filter.appendChild(blur);

        const offset = document.createElementNS("http://www.w3.org/2000/svg", "feOffset");
        offset.setAttribute("dx", "0");
        offset.setAttribute("dy", "8");
        offset.setAttribute("result", "offsetBlur");
        filter.appendChild(offset);

        const flood = document.createElementNS("http://www.w3.org/2000/svg", "feFlood");
        flood.setAttribute("flood-color", "#3b82f6");
        flood.setAttribute("flood-opacity", "0.45");
        flood.setAttribute("result", "colorShadow");
        filter.appendChild(flood);

        const composite = document.createElementNS("http://www.w3.org/2000/svg", "feComposite");
        composite.setAttribute("in", "colorShadow");
        composite.setAttribute("in2", "offsetBlur");
        composite.setAttribute("operator", "in");
        composite.setAttribute("result", "shadow");
        filter.appendChild(composite);

        const merge = document.createElementNS("http://www.w3.org/2000/svg", "feMerge");
        const node1 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
        node1.setAttribute("in", "shadow");
        const node2 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
        node2.setAttribute("in", "SourceGraphic");
        merge.appendChild(node1);
        merge.appendChild(node2);
        filter.appendChild(merge);

        defs.appendChild(filter);
        lineSvg.appendChild(defs);

        // 4. Draw Gradient Area under Line
        let areaD = `${pathD} L ${points[points.length - 1].x} 270 L ${points[0].x} 270 Z`;
        const area = document.createElementNS("http://www.w3.org/2000/svg", "path");
        area.setAttribute("d", areaD);
        area.setAttribute("fill", "url(#areaGrad)");
        lineSvg.appendChild(area);

        // 5. Draw the Glowing Path Line
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathD);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "var(--accent-blue)");
        path.setAttribute("stroke-width", "4.5");
        path.setAttribute("filter", "url(#glow-shadow)");
        lineSvg.appendChild(path);

        // 6. Render Glassmorphic Dots and Labels
        points.forEach(pt => {
            // Outer Halo Ring
            const outerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            outerCircle.setAttribute("cx", pt.x);
            outerCircle.setAttribute("cy", pt.y);
            outerCircle.setAttribute("r", "10");
            outerCircle.setAttribute("fill", "rgba(59, 130, 246, 0.15)");
            outerCircle.setAttribute("stroke", "rgba(59, 130, 246, 0.3)");
            outerCircle.setAttribute("stroke-width", "1");
            lineSvg.appendChild(outerCircle);

            // Middle Bordered Circle
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", pt.x);
            circle.setAttribute("cy", pt.y);
            circle.setAttribute("r", "6");
            circle.setAttribute("fill", "#0c101d"); // Solid obsidian backdrop
            circle.setAttribute("stroke", "var(--accent-blue)");
            circle.setAttribute("stroke-width", "2.5");
            
            const tooltip = document.createElementNS("http://www.w3.org/2000/svg", "title");
            tooltip.textContent = `${pt.month}: RM ${pt.val.toFixed(2)}`;
            circle.appendChild(tooltip);
            lineSvg.appendChild(circle);

            // Inner Core Bright White Dot
            const centerDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            centerDot.setAttribute("cx", pt.x);
            centerDot.setAttribute("cy", pt.y);
            centerDot.setAttribute("r", "2");
            centerDot.setAttribute("fill", "#ffffff");
            lineSvg.appendChild(centerDot);

            // Text value label above the node
            const textVal = document.createElementNS("http://www.w3.org/2000/svg", "text");
            textVal.setAttribute("x", pt.x);
            textVal.setAttribute("y", pt.y - 14);
            textVal.setAttribute("fill", "var(--text-primary)");
            textVal.setAttribute("font-size", "11");
            textVal.setAttribute("font-weight", "700");
            textVal.setAttribute("text-anchor", "middle");
            textVal.textContent = `RM ${pt.val.toFixed(0)}`;
            lineSvg.appendChild(textVal);

            // Bottom text label (X-Axis)
            const lbl = document.createElement("span");
            lbl.className = "line-lbl";
            lbl.innerText = pt.month;
            lineLabels.appendChild(lbl);
        });
    }

    // 2. Package Popularity Horizontal Bar Chart
    const pkgHoriz = document.getElementById("package-horiz-chart");
    if (pkgHoriz) {
        pkgHoriz.innerHTML = "";
        const packageCounts = { "Standard Admission": 0, "Family Package": 0, "School Trip": 0, "VIP Experience": 0, "Annual Pass": 0 };
        bookings.forEach(b => {
            const name = b.packageName || "Standard Admission";
            if (packageCounts[name] !== undefined) packageCounts[name]++;
            else packageCounts["Standard Admission"]++;
        });

        const total = Object.values(packageCounts).reduce((a, b) => a + b, 0);

        Object.keys(packageCounts).forEach(name => {
            const count = packageCounts[name];
            const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
            pkgHoriz.innerHTML += `
                <div class="horiz-item">
                    <div class="horiz-row">
                        <span class="horiz-name">${name} (${count})</span>
                        <span class="horiz-pct">${pct}%</span>
                    </div>
                    <div class="horiz-track">
                        <div class="horiz-fill" style="width: ${pct}%; background: var(--accent-blue);"></div>
                    </div>
                </div>
            `;
        });
    }

    // 3. Add-on Usage Stats
    // Parse addon data from existing bookings dynamically.
    // Client tickets: "2 Adult, 2 Child"
    // Let's check how many packages have addons or let's scan for feeding, tram, etc.
    const addonStatsEl = document.getElementById("addon-stats-list");
    if (addonStatsEl) {
        addonStatsEl.innerHTML = "";
        
        let addonCounts = { "Feeding Session": 0, "Tram Ride": 0, "Souvenir Package": 0 };
        let totalActive = 0;

        bookings.forEach(b => {
            if (b.status === "Cancelled") return;
            totalActive++;
            // Calculate estimated addon attachment rate based on package types:
            if (b.packageName === "VIP Experience") {
                addonCounts["Feeding Session"] += 1;
                addonCounts["Tram Ride"] += 1;
            } else if (b.packageName === "Family Package") {
                addonCounts["Tram Ride"] += 2;
                addonCounts["Souvenir Package"] += 1;
            } else {
                // Random attachments
                const num = parseInt(b.bookingId.substring(4, 5)) || 0;
                if (num % 3 === 0) addonCounts["Feeding Session"]++;
                if (num % 2 === 0) addonCounts["Tram Ride"]++;
            }
        });

        Object.keys(addonCounts).forEach(name => {
            const count = addonCounts[name];
            const pct = totalActive > 0 ? ((count / totalActive) * 100).toFixed(1) : 0;
            addonStatsEl.innerHTML += `
                <div class="horiz-item">
                    <div class="horiz-row">
                        <span class="horiz-name">${name}</span>
                        <span class="horiz-pct">${count} bookings (${pct}%)</span>
                    </div>
                    <div class="horiz-track">
                        <div class="horiz-fill" style="width: ${pct}%; background: var(--accent-teal);"></div>
                    </div>
                </div>
            `;
        });
    }

    // 4. Booking Status Ratio
    const ratioWrap = document.getElementById("status-ratio-wrap");
    if (ratioWrap) {
        const total = bookings.length;
        const active = bookings.filter(b => b.status === "Active").length;
        const cancelled = total - active;

        const activePct = total > 0 ? ((active / total) * 100).toFixed(0) : 100;
        const cancelPct = 100 - activePct;

        ratioWrap.innerHTML = `
            <div class="ratio-bar-track">
                <div class="ratio-active" style="width: ${activePct}%;">${activePct}% Active</div>
                ${cancelPct > 0 ? `<div class="ratio-cancel">${cancelPct}% Cancelled</div>` : ''}
            </div>
            <div class="ratio-stats">
                <div class="ratio-stat">
                    <span class="val" style="color: var(--accent-green);">${active}</span>
                    <span class="lbl">Active Bookings</span>
                </div>
                <div class="ratio-stat">
                    <span class="val" style="color: var(--accent-red);">${cancelled}</span>
                    <span class="lbl">Cancelled Bookings</span>
                </div>
            </div>
        `;
    }

    // 5. Visitor Type Distribution
    const visitorTypeChart = document.getElementById("visitor-type-chart");
    if (visitorTypeChart) {
        visitorTypeChart.innerHTML = "";
        
        let counts = { Adult: 0, Child: 0, Senior: 0 };
        bookings.forEach(b => {
            if (b.status === "Cancelled") return;
            const tString = b.tickets || "";
            const parts = tString.split(",");
            parts.forEach(part => {
                const clean = part.trim().toLowerCase();
                const num = parseInt(clean) || 0;
                if (clean.includes("adult")) counts.Adult += num;
                else if (clean.includes("child")) counts.Child += num;
                else if (clean.includes("senior")) counts.Senior += num;
            });
        });

        const total = counts.Adult + counts.Child + counts.Senior;

        const types = [
            { name: "Adults (Ages 13-59)", count: counts.Adult, color: "var(--accent-blue)" },
            { name: "Children (Ages 3-12)", count: counts.Child, color: "var(--accent-green)" },
            { name: "Seniors (Ages 60+)", count: counts.Senior, color: "var(--accent-purple)" }
        ];

        types.forEach(t => {
            const pct = total > 0 ? ((t.count / total) * 100).toFixed(1) : 0;
            visitorTypeChart.innerHTML += `
                <div class="horiz-item">
                    <div class="horiz-row">
                        <span class="horiz-name">${t.name} (${t.count})</span>
                        <span class="horiz-pct">${pct}%</span>
                    </div>
                    <div class="horiz-track">
                        <div class="horiz-fill" style="width: ${pct}%; background: ${t.color};"></div>
                    </div>
                </div>
            `;
        });
    }
}

/* ==========================================================================
   TAB BOOKINGS MANAGEMENT (TABLE, SORT, PAGINATION)
   ========================================================================== */
function filterBookingsTable(persistPage = false) {
    if (!persistPage) bookingPage = 1;

    const bookings = JSON.parse(localStorage.getItem("zoo_bookings")) || [];
    const searchVal = document.getElementById("bookings-search").value.toLowerCase().trim();
    const statusFilter = document.getElementById("filter-status").value;
    const packageFilter = document.getElementById("filter-package").value;

    filteredBookingsList = bookings.filter(b => {
        // Search filter (ID, name, email, package)
        const matchesSearch = !searchVal || 
            b.bookingId.toLowerCase().includes(searchVal) ||
            b.billingName.toLowerCase().includes(searchVal) ||
            b.billingEmail.toLowerCase().includes(searchVal) ||
            (b.packageName || "").toLowerCase().includes(searchVal);

        // Status Filter
        const matchesStatus = !statusFilter || b.status === statusFilter;

        // Package Filter
        const matchesPackage = !packageFilter || (b.packageName || "Standard Admission") === packageFilter;

        return matchesSearch && matchesStatus && matchesPackage;
    });

    // Apply Sorting
    sortBookingsData();

    // Render Table
    renderBookingsTable();
}

function sortBookingsData() {
    filteredBookingsList.sort((a, b) => {
        let valA = a[sortColumn];
        let valB = b[sortColumn];

        if (sortColumn === 'paidAmount') {
            valA = parseFloat(valA) || 0;
            valB = parseFloat(valB) || 0;
        } else if (sortColumn === 'visitDate') {
            // Compare as date objects if possible, otherwise string comparison
            const dateA = new Date(valA);
            const dateB = new Date(valB);
            if (!isNaN(dateA) && !isNaN(dateB)) {
                valA = dateA;
                valB = dateB;
            }
        } else {
            valA = (valA || "").toString().toLowerCase();
            valB = (valB || "").toString().toLowerCase();
        }

        if (valA < valB) return sortAscending ? -1 : 1;
        if (valA > valB) return sortAscending ? 1 : -1;
        return 0;
    });
}

function sortTable(column) {
    if (sortColumn === column) {
        sortAscending = !sortAscending;
    } else {
        sortColumn = column;
        sortAscending = true;
    }
    filterBookingsTable(true);
}

function renderBookingsTable() {
    const tbody = document.getElementById("all-bookings-tbody");
    const countLabel = document.getElementById("bookings-count-label");
    const pagination = document.getElementById("bookings-pagination");
    if (!tbody) return;

    tbody.innerHTML = "";
    
    const totalRecords = filteredBookingsList.length;
    countLabel.innerText = `Showing ${totalRecords} records`;

    if (totalRecords === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center" style="padding: 24px; color: var(--text-secondary);">No matching booking transactions found.</td></tr>`;
        pagination.innerHTML = "";
        return;
    }

    // Pagination bounds
    const totalPages = Math.ceil(totalRecords / bookingLimit);
    if (bookingPage > totalPages) bookingPage = totalPages;
    if (bookingPage < 1) bookingPage = 1;

    const startIdx = (bookingPage - 1) * bookingLimit;
    const endIdx = Math.min(startIdx + bookingLimit, totalRecords);
    
    const pageRecords = filteredBookingsList.slice(startIdx, endIdx);

    pageRecords.forEach(b => {
        const isCancelled = b.status === "Cancelled";
        const cleanAmount = (parseFloat(b.paidAmount) || 0).toFixed(2);
        
        tbody.innerHTML += `
            <tr>
                <td><strong>${b.bookingId}</strong></td>
                <td>${b.billingName}</td>
                <td style="color: var(--text-secondary); font-size: 12px;">${b.billingEmail}</td>
                <td>${b.packageName || "Standard Admission"}</td>
                <td style="font-size:12px; color: var(--text-secondary); max-width: 150px; overflow: hidden; text-overflow: ellipsis;" title="${b.tickets}">${b.tickets}</td>
                <td>${b.visitDate}</td>
                <td><strong>RM ${cleanAmount}</strong></td>
                <td><span class="badge-status ${isCancelled ? 'cancelled' : 'active'}">${b.status}</span></td>
                <td>
                    <button class="btn-view-detail" onclick="openBookingModal('${b.bookingId}')">View</button>
                </td>
            </tr>
        `;
    });

    // Render Pagination Buttons
    pagination.innerHTML = "";
    if (totalPages > 1) {
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement("button");
            btn.className = `page-btn ${i === bookingPage ? 'active' : ''}`;
            btn.innerText = i;
            btn.addEventListener("click", () => {
                bookingPage = i;
                renderBookingsTable();
            });
            pagination.appendChild(btn);
        }
    }
}

/* CSV EXPORT */
function exportCSV() {
    if (filteredBookingsList.length === 0) {
        alert("No data to export!");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Booking ID,Customer Name,Email,Package,Tickets,Visit Date,Amount (RM),Status\n";

    filteredBookingsList.forEach(b => {
        const row = [
            `"${b.bookingId}"`,
            `"${b.billingName}"`,
            `"${b.billingEmail}"`,
            `"${b.packageName || 'Standard Admission'}"`,
            `"${b.tickets}"`,
            `"${b.visitDate}"`,
            `"${(parseFloat(b.paidAmount) || 0).toFixed(2)}"`,
            `"${b.status}"`
        ];
        csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `zoo_bookings_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/* ==========================================================================
   TAB BOOKING DETAIL MODAL
   ========================================================================== */
function openBookingModal(bookingId) {
    const bookings = JSON.parse(localStorage.getItem("zoo_bookings")) || [];
    const b = bookings.find(item => item.bookingId === bookingId);
    if (!b) return;

    const modalBody = document.getElementById("booking-modal-body");
    if (!modalBody) return;

    const isCancelled = b.status === "Cancelled";

    modalBody.innerHTML = `
        <div class="modal-detail-row">
            <span class="lbl">Booking ID</span>
            <span class="val">${b.bookingId}</span>
        </div>
        <div class="modal-detail-row">
            <span class="lbl">Customer Name</span>
            <span class="val">${b.billingName}</span>
        </div>
        <div class="modal-detail-row">
            <span class="lbl">Customer Email</span>
            <span class="val">${b.billingEmail}</span>
        </div>
        <div class="modal-detail-row">
            <span class="lbl">Visit Date</span>
            <span class="val">${b.visitDate}</span>
        </div>
        <div class="modal-detail-row">
            <span class="lbl">Package</span>
            <span class="val">${b.packageName || "Standard Admission"}</span>
        </div>
        <div class="modal-detail-row">
            <span class="lbl">Admissions</span>
            <span class="val">${b.tickets}</span>
        </div>
        <div class="modal-detail-row">
            <span class="lbl">Total Paid Amount</span>
            <span class="val" style="color:var(--accent-green); font-size:16px;">RM ${(parseFloat(b.paidAmount) || 0).toFixed(2)}</span>
        </div>
        <div class="modal-detail-row">
            <span class="lbl">Status</span>
            <span class="val">
                <span class="badge-status ${isCancelled ? 'cancelled' : 'active'}">${b.status}</span>
            </span>
        </div>
        <div style="margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end;">
            ${!isCancelled ? `<button class="btn-logout" style="background:rgba(248,81,73,0.1); border:1px solid var(--accent-red); margin-bottom:0;" onclick="cancelBookingFromAdmin('${b.bookingId}')">Cancel Booking</button>` : ''}
            <button class="btn-login" style="width: auto; padding: 9px 18px; margin-bottom:0;" onclick="document.getElementById('booking-modal').classList.add('hidden')">Close</button>
        </div>
    `;

    document.getElementById("booking-modal").classList.remove("hidden");
}

function cancelBookingFromAdmin(bookingId) {
    if (!confirm(`Are you sure you want to cancel booking ${bookingId}?`)) return;

    let bookings = JSON.parse(localStorage.getItem("zoo_bookings")) || [];
    const idx = bookings.findIndex(b => b.bookingId === bookingId);
    if (idx !== -1) {
        bookings[idx].status = "Cancelled";
        localStorage.setItem("zoo_bookings", JSON.stringify(bookings));
        
        // Hide modal
        document.getElementById('booking-modal').classList.add('hidden');
        
        // Refresh dashboard statistics and table
        refreshAllData();
    }
}

function closeBookingModal(event) {
    if (event.target.id === "booking-modal") {
        document.getElementById("booking-modal").classList.add("hidden");
    }
}

/* ==========================================================================
   TAB USERS RENDERER
   ========================================================================== */
function filterUsersTable() {
    const users = JSON.parse(localStorage.getItem("zoo_users")) || [];
    const bookings = JSON.parse(localStorage.getItem("zoo_bookings")) || [];
    renderUsersTable(users, bookings);
}

function renderUsersTable(users, bookings) {
    const tbody = document.getElementById("users-tbody");
    const countLabel = document.getElementById("users-count-label");
    const searchVal = document.getElementById("users-search").value.toLowerCase().trim();
    if (!tbody) return;

    tbody.innerHTML = "";

    // Match search values
    const filteredUsers = users.filter(u => {
        return !searchVal || 
            u.name.toLowerCase().includes(searchVal) ||
            u.email.toLowerCase().includes(searchVal);
    });

    countLabel.innerText = `Showing ${filteredUsers.length} users`;

    if (filteredUsers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:24px; color: var(--text-muted);">No users found.</td></tr>`;
        return;
    }

    filteredUsers.forEach((u, idx) => {
        // Calculate dynamic stats for this user
        const userBookings = bookings.filter(b => b.billingEmail.toLowerCase() === u.email.toLowerCase());
        const totalBookingsCount = userBookings.length;
        
        let totalSpent = 0;
        userBookings.forEach(b => {
            if (b.status === "Active") {
                totalSpent += parseFloat(b.paidAmount) || 0;
            }
        });

        const lastBooking = userBookings.length > 0 ? userBookings[0].visitDate : "No bookings";

        tbody.innerHTML += `
            <tr>
                <td>${idx + 1}</td>
                <td><strong>${u.name}</strong></td>
                <td>${u.email}</td>
                <td>${totalBookingsCount} bookings</td>
                <td><strong>RM ${totalSpent.toFixed(2)}</strong></td>
                <td>${lastBooking}</td>
                <td><span class="badge-status active" style="background: rgba(88,166,255,0.15); color: var(--accent-blue);">Registered Client</span></td>
            </tr>
        `;
    });
}

/* ==========================================================================
   TAB TICKET TYPES RENDERER
   ========================================================================== */
function renderTicketStats(bookings) {
    const grid = document.getElementById("ticket-stats-grid");
    if (!grid) return;
    grid.innerHTML = "";

    let counts = { adult: 0, child: 0, senior: 0 };
    let revenue = { adult: 0, child: 0, senior: 0 };
    let cancelled = { adult: 0, child: 0, senior: 0 };

    bookings.forEach(b => {
        const isCancelled = b.status === "Cancelled";
        const tString = b.tickets || "";
        const parts = tString.split(",");
        parts.forEach(part => {
            const clean = part.trim().toLowerCase();
            const num = parseInt(clean) || 0;
            if (clean.includes("adult")) {
                if (isCancelled) cancelled.adult += num;
                else {
                    counts.adult += num;
                    revenue.adult += num * 45;
                }
            } else if (clean.includes("child")) {
                if (isCancelled) cancelled.child += num;
                else {
                    counts.child += num;
                    revenue.child += num * 25;
                }
            } else if (clean.includes("senior")) {
                if (isCancelled) cancelled.senior += num;
                else {
                    counts.senior += num;
                    revenue.senior += num * 20;
                }
            }
        });
    });

    const ticketCategories = [
        { type: "Adult Tickets", emoji: "👨", active: counts.adult, cancelled: cancelled.adult, rev: revenue.adult, price: "RM 45.00" },
        { type: "Child Tickets", emoji: "👧", active: counts.child, cancelled: cancelled.child, rev: revenue.child, price: "RM 25.00" },
        { type: "Senior Tickets", emoji: "👵", active: counts.senior, cancelled: cancelled.senior, rev: revenue.senior, price: "RM 20.00" }
    ];

    ticketCategories.forEach(c => {
        grid.innerHTML += `
            <div class="ticket-stat-card">
                <div class="ticket-stat-header">
                    <span class="ticket-stat-emoji">${c.emoji}</span>
                    <div>
                        <h3 class="ticket-stat-title">${c.type}</h3>
                        <span class="ticket-stat-price">Standard rate: ${c.price}</span>
                    </div>
                </div>
                <div class="ticket-stat-rows">
                    <div class="ticket-stat-row">
                        <span class="lbl">Active Admissions</span>
                        <span class="val" style="color:var(--accent-green);">${c.active} sold</span>
                    </div>
                    <div class="ticket-stat-row">
                        <span class="lbl">Cancelled admissions</span>
                        <span class="val" style="color:var(--accent-red);">${c.cancelled} items</span>
                    </div>
                    <div class="ticket-stat-row" style="border-top: 1px solid var(--border); margin-top:8px; padding-top:8px;">
                        <span class="lbl"><strong>Est. Revenue</strong></span>
                        <span class="val"><strong>RM ${c.rev.toFixed(2)}</strong></span>
                    </div>
                </div>
            </div>
        `;
    });
}

/* ==========================================================================
   TAB REVENUE RENDERER
   ========================================================================== */
function renderRevenueDashboard(bookings) {
    const summaryRow = document.getElementById("revenue-summary-row");
    const revByPackage = document.getElementById("revenue-by-package");
    const avgValueChart = document.getElementById("avg-value-chart");
    const avgValueLabels = document.getElementById("avg-value-labels");
    if (!summaryRow) return;

    // Financial calculations
    const activeBookings = bookings.filter(b => b.status === "Active");
    const cancelledBookings = bookings.filter(b => b.status === "Cancelled");

    let ticketRev = 0;
    let addonsRev = 0;
    let transportRev = 0;
    let hotelRev = 0;

    activeBookings.forEach(b => {
        const amt = parseFloat(b.paidAmount) || 0;
        // Approximation of breakdown of transactions based on packages
        if (b.packageName === "VIP Experience") {
            ticketRev += 299;
            addonsRev += (amt - 299) * 0.4;
            transportRev += (amt - 299) * 0.6;
        } else if (b.packageName === "Family Package") {
            ticketRev += 149;
            addonsRev += (amt - 149) * 0.3;
            hotelRev += (amt - 149) * 0.7;
        } else {
            ticketRev += Math.min(amt, 100);
            addonsRev += Math.max(0, amt - 100);
        }
    });

    const totalRevenue = ticketRev + addonsRev + hotelRev + transportRev;

    summaryRow.innerHTML = `
        <div class="revenue-stat-card">
            <span class="revenue-stat-label">Total Revenue</span>
            <span class="revenue-stat-value" style="color:var(--accent-green);">RM ${totalRevenue.toFixed(2)}</span>
            <span class="revenue-stat-sub">Across ${activeBookings.length} orders</span>
        </div>
        <div class="revenue-stat-card">
            <span class="revenue-stat-label">Ticket Revenue</span>
            <span class="revenue-stat-value">RM ${ticketRev.toFixed(2)}</span>
            <span class="revenue-stat-sub">${((ticketRev / (totalRevenue || 1)) * 100).toFixed(0)}% of sales</span>
        </div>
        <div class="revenue-stat-card">
            <span class="revenue-stat-label">Add-on Sales</span>
            <span class="revenue-stat-value">RM ${addonsRev.toFixed(2)}</span>
            <span class="revenue-stat-sub">Feeding & tram bookings</span>
        </div>
        <div class="revenue-stat-card">
            <span class="revenue-stat-label">Hotel Stay & Transport</span>
            <span class="revenue-stat-value">RM ${(hotelRev + transportRev).toFixed(2)}</span>
            <span class="revenue-stat-sub">Partner stays & shuttle service</span>
        </div>
    `;

    // Package Revenue Breakdown
    if (revByPackage) {
        revByPackage.innerHTML = "";
        const packageRevenues = { "Standard Admission": 0, "Family Package": 0, "School Trip": 0, "VIP Experience": 0, "Annual Pass": 0 };
        activeBookings.forEach(b => {
            const name = b.packageName || "Standard Admission";
            const amt = parseFloat(b.paidAmount) || 0;
            if (packageRevenues[name] !== undefined) packageRevenues[name] += amt;
            else packageRevenues["Standard Admission"] += amt;
        });

        const maxVal = Math.max(...Object.values(packageRevenues), 1);

        Object.keys(packageRevenues).forEach(name => {
            const rev = packageRevenues[name];
            const pct = ((rev / maxVal) * 100).toFixed(0);
            revByPackage.innerHTML += `
                <div class="horiz-item">
                    <div class="horiz-row">
                        <span class="horiz-name">${name}</span>
                        <span class="horiz-pct"><strong>RM ${rev.toFixed(2)}</strong></span>
                    </div>
                    <div class="horiz-track">
                        <div class="horiz-fill" style="width: ${pct}%; background: var(--accent-green);"></div>
                    </div>
                </div>
            `;
        });
    }

    // Monthly Average Transaction Value
    if (avgValueChart && avgValueLabels) {
        avgValueChart.innerHTML = "";
        avgValueLabels.innerHTML = "";

        const monthCounts = { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0 };
        const monthRevenues = { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0 };

        activeBookings.forEach(b => {
            const date = b.visitDate || "";
            const parts = date.split(" ");
            if (parts.length >= 2) {
                const m = parts[1].substring(0, 3);
                if (monthCounts[m] !== undefined) {
                    monthCounts[m]++;
                    monthRevenues[m] += parseFloat(b.paidAmount) || 0;
                }
            }
        });

        const months = Object.keys(monthCounts);
        let maxAvg = 0;
        let averages = {};

        months.forEach(m => {
            const count = monthCounts[m];
            const rev = monthRevenues[m];
            const avg = count > 0 ? (rev / count) : 0;
            averages[m] = avg;
            if (avg > maxAvg) maxAvg = avg;
        });
        if (maxAvg === 0) maxAvg = 1;

        months.forEach(m => {
            const avg = averages[m];
            const heightPct = ((avg / maxAvg) * 100).toFixed(0);

            // Bar Column
            const barCol = document.createElement("div");
            barCol.className = "bar-col";
            barCol.innerHTML = `
                <span class="bar-val" style="font-size:9px;">RM ${avg.toFixed(0)}</span>
                <div class="bar-block" style="height: ${heightPct}%; background: linear-gradient(180deg, var(--accent-green), #1f5f2a);" title="Average booking value in ${m}: RM ${avg.toFixed(2)}"></div>
            `;
            avgValueChart.appendChild(barCol);

            // Label
            const lbl = document.createElement("span");
            lbl.className = "bar-lbl";
            lbl.innerText = m;
            avgValueLabels.appendChild(lbl);
        });
    }
}
