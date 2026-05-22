/* ==========================================================================
   ZOO ADVENTURE CORE DATABASE & STATE ENGINE
   ========================================================================== */
const state = {
    step: 1,
    selectedPackage: null, // 'family' | 'school' | 'vip' | 'annual'
    tickets: {
        adult: 0,
        child: 0,
        senior: 0
    },
    visitDate: '',
    addons: {
        feeding: 0,
        tram: 0,
        souvenir: 0
    },
    hotel: null,        // null | 'budget' | 'standard' | 'premium'
    hotelNights: {
        budget: 1,
        standard: 1,
        premium: 1
    },
    transport: null,    // null | 'shuttle' | 'car' | 'limo'
    promoCode: '',
    discountPercent: 0,
    checkoutMode: null, // 'guest' | 'login' | 'register'
    billingDetails: {
        name: '',
        email: '',
        phone: ''
    },
    paymentMethod: null,
    bookingId: '',
    totals: {
        ticketsSubtotal: 0,
        addonsSubtotal: 0,
        discountAmount: 0,
        grandTotal: 0
    },
    sessionUser: null // Stores { name, email } when logged in
};

// User DB in memory (initialized from localStorage if exists)
let registeredUsers = JSON.parse(localStorage.getItem("zoo_users")) || [
    { name: "Faizal Ahmad", email: "faizal@gmail.com", pass: "password" }
];

// Price configuration (MYR)
const PRICING = {
    standard: { adult: 45, child: 25, senior: 20 },
    family: {
        basePrice: 149, // 2 adults + 2 children
        extraAdult: 40,
        extraChild: 20,
        extraSenior: 15
    },
    school: { flatRate: 25, minPax: 15 },
    vip: { flatRate: 299 },
    annual: { flatRate: 199 }
};

const ADDONS_PRICING = {
    feeding: 20,
    tram: 15,
    souvenir: 25
};

const HOTEL_PRICING = {
    budget:   99,
    standard: 179,
    premium:  349
};

const TRANSPORT_PRICING = {
    shuttle: 15,  // per person
    car:     65,  // per trip (flat)
    limo:    150  // per trip (flat)
};

// 12-Step metadata for programmatic rendering
const STEPS_META = [
    { num: 1,  name: "Homepage" },
    { num: 2,  name: "Browse Packages" },
    { num: 3,  name: "Select Ticket" },
    { num: 4,  name: "Select Date" },
    { num: 5,  name: "Add-ons / Promos" },
    { num: 55, name: "Hotel & Transport" },
    { num: 6,  name: "Cart Review" },
    { num: 7,  name: "Login / Guest" },
    { num: 8,  name: "Payment Choice" },
    { num: 9,  name: "Payment Processing" },
    { num: 10, name: "Payment Success" },
    { num: 11, name: "E-Ticket" },
    { num: 12, name: "Ticket Delivery" }
];

// Calendar Date states
let currentYear = 2026;
let currentMonth = 4; // May (0-indexed is 4)

/* ==========================================================================
   APP BOOTSTRAP & DEMO DATA SEED
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    // Seed initial demo bookings if localStorage is empty
    seedDemoBookings();

    // Check if user is already logged in
    const activeSession = JSON.parse(localStorage.getItem("zoo_active_session"));
    if (activeSession) {
        state.sessionUser = activeSession;
    }

    // Always update auth UI on load (sets default Login button or avatar)
    updateHeaderAuthUI();

    // Load initial calendar
    renderCalendar(currentYear, currentMonth);

    // Initial cart badge count
    updateHeaderCartBadge();

    // Start on homepage = transparent header
    setHeaderMode('transparent');

    // Initialize animal carousel
    initCarousel();

    // Initialize partner hotels list for standalone accommodation page
    renderHotelsList();
});

function seedDemoBookings() {
    const existing = localStorage.getItem("zoo_bookings");
    if (!existing) {
        const demoData = [
            {
                bookingId: "ZW128509121",
                visitDate: "15 May 2026",
                packageName: "Family Package",
                tickets: "2 Adult, 2 Child",
                billingName: "Faizal Ahmad",
                billingEmail: "faizal@gmail.com",
                paidAmount: 149.00,
                status: "Active"
            },
            {
                bookingId: "ZW123440982",
                visitDate: "28 April 2026",
                packageName: "VIP Experience",
                tickets: "1 Adult",
                billingName: "Sarah Connor",
                billingEmail: "sarah@example.com",
                paidAmount: 299.00,
                status: "Cancelled"
            }
        ];
        localStorage.setItem("zoo_bookings", JSON.stringify(demoData));
    }
}

/* ==========================================================================
   NAVIGATION CONTROL
   ========================================================================== */
function goToStep(stepNum) {
    // Manage active links in nav header
    document.querySelectorAll(".main-nav a").forEach(a => a.classList.remove("active"));
    if (stepNum === 1) document.getElementById("nav-home").classList.add("active");
    else if (stepNum === 2) document.getElementById("nav-packages").classList.add("active");
    else if (stepNum === 3) document.getElementById("nav-tickets").classList.add("active");
    else if (stepNum === 'accommodation') document.getElementById("nav-accom").classList.add("active");

    // Close mobile menu if open
    const nav = document.querySelector(".main-nav");
    const toggleBtn = document.getElementById("mobile-menu-toggle");
    if (nav && nav.classList.contains("open")) {
        nav.classList.remove("open");
    }
    if (toggleBtn && toggleBtn.classList.contains("open")) {
        toggleBtn.classList.remove("open");
    }

    // Hide all step screens
    document.querySelectorAll(".booking-step").forEach(step => {
        step.classList.remove("active");
    });

    // Show target step screen
    const targetStep = document.getElementById(`step-${stepNum}`);
    if (targetStep) {
        targetStep.classList.add("active");
        state.step = stepNum;

        // Dynamically inject the 12-step tracker inside sub-pages (excluding accommodation)
        const trackerContainer = document.getElementById(`tracker-step-${stepNum}`);
        if (trackerContainer) {
            if (stepNum !== 'accommodation') {
                trackerContainer.innerHTML = buildFunnelTrackerHTML(stepNum);
            } else {
                trackerContainer.innerHTML = '';
            }
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Switch header style: transparent on homepage, solid on other pages
    if (stepNum === 1) {
        setHeaderMode('transparent');
    } else {
        setHeaderMode('solid');
    }
}

function toggleMobileMenu() {
    const nav = document.querySelector(".main-nav");
    const toggleBtn = document.getElementById("mobile-menu-toggle");
    if (nav) nav.classList.toggle("open");
    if (toggleBtn) toggleBtn.classList.toggle("open");
}

function resetToHome() {
    resetBookingFlow();
    goToStep(1);
    setHeaderMode('transparent');
}

// Toggle the header between transparent (over hero) and solid (sub-pages)
function setHeaderMode(mode) {
    const header = document.getElementById('app-header');
    const loginBtn = document.getElementById('hero-login-btn');
    if (!header) return;

    if (mode === 'transparent') {
        header.classList.remove('solid');
        // Show solid green Login pill over hero
        if (loginBtn) loginBtn.style.display = 'inline-flex';
    } else {
        header.classList.add('solid');
        // Hide the hero Login pill on sub-pages (auth-session-area handles it)
        if (loginBtn) loginBtn.style.display = 'none';
    }
}

// Generate HTML string for the stepper bar inside checkout stages
function buildFunnelTrackerHTML(activeStep) {
    let html = `<div class="steps-horizontal-path">`;
    STEPS_META.forEach((item, idx) => {
        const isActive = item.num === activeStep;
        const isCompleted = item.num < activeStep;

        html += `
            <div class="funnel-dot ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}" onclick="if(${isCompleted || item.num <= 7}){ goToStep(${item.num}); }">
                <span class="num">${isCompleted ? '✓' : item.num}</span>
                <span class="lbl">${item.name}</span>
            </div>
        `;
        if (idx < STEPS_META.length - 1) {
            html += `<div class="funnel-arrow">➔</div>`;
        }
    });
    html += `</div>`;
    return html;
}

/* ==========================================================================
   ACCOUNT SESSIONS (AUTH MODAL HANDLING)
   ========================================================================== */
let authModalMode = 'login'; // 'login' | 'register'

function openAuthModal(mode = 'login') {
    authModalMode = mode;
    const modal = document.getElementById("auth-modal");
    modal.classList.remove("hidden");

    // Toggle field visibility
    const nameField = document.getElementById("auth-field-name");
    const title = document.getElementById("auth-modal-title");
    const btn = document.getElementById("auth-modal-btn");
    const promptLink = document.getElementById("auth-modal-toggle-link");
    const promptTxt = document.getElementById("auth-modal-prompt-text");

    if (mode === 'login') {
        nameField.classList.add("hidden");
        title.innerText = "Sign In";
        btn.innerText = "Sign In";
        promptTxt.innerText = "Don't have an account?";
        promptLink.innerText = "Register here";
    } else {
        nameField.classList.remove("hidden");
        title.innerText = "Register Account";
        btn.innerText = "Register Account";
        promptTxt.innerText = "Already have an account?";
        promptLink.innerText = "Sign in here";
    }
}

function closeAuthModal() {
    document.getElementById("auth-modal").classList.add("hidden");
    // Clear forms
    document.getElementById("auth-modal-email").value = '';
    document.getElementById("auth-modal-name").value = '';
    document.getElementById("auth-modal-pass").value = '';
}

function toggleAuthModalMode() {
    if (authModalMode === 'login') {
        openAuthModal('register');
    } else {
        openAuthModal('login');
    }
}

function handleAuthSubmit(event) {
    event.preventDefault();
    const email = document.getElementById("auth-modal-email").value.trim().toLowerCase();
    const pass = document.getElementById("auth-modal-pass").value;
    const name = document.getElementById("auth-modal-name").value.trim();

    if (authModalMode === 'login') {
        // Authenticate user
        const user = registeredUsers.find(u => u.email === email && u.pass === pass);
        if (user) {
            state.sessionUser = { name: user.name, email: user.email };
            localStorage.setItem("zoo_active_session", JSON.stringify(state.sessionUser));
            updateHeaderAuthUI();
            closeAuthModal();
        } else {
            alert("Invalid email or password. You can register a new account if needed.");
        }
    } else {
        // Register user
        if (registeredUsers.some(u => u.email === email)) {
            alert("Email address already registered.");
            return;
        }

        const newUser = { name, email, pass };
        registeredUsers.push(newUser);
        localStorage.setItem("zoo_users", JSON.stringify(registeredUsers));

        // Log in immediately
        state.sessionUser = { name, email };
        localStorage.setItem("zoo_active_session", JSON.stringify(state.sessionUser));
        updateHeaderAuthUI();
        closeAuthModal();
    }
}

function logoutUser() {
    state.sessionUser = null;
    localStorage.removeItem("zoo_active_session");
    updateHeaderAuthUI();
    resetBookingFlow();
}

function updateHeaderAuthUI() {
    const area = document.getElementById("auth-session-area");
    const loginBtn = document.getElementById("hero-login-btn");
    if (!area) return;

    if (state.sessionUser) {
        // User is logged in: show avatar + logout in auth-session-area
        const initials = state.sessionUser.name.split(" ").map(n => n[0]).join("").toUpperCase();
        area.innerHTML = `
            <div class="user-profile-badge" title="Logged in as ${state.sessionUser.name}">
                <div class="avatar-circle">${initials}</div>
                <a href="#" class="logout-link" onclick="logoutUser()">Logout</a>
            </div>
        `;
        // Hide the hero login pill when user is already logged in
        if (loginBtn) loginBtn.style.display = 'none';
    } else {
        // Not logged in
        const header = document.getElementById('app-header');
        const isSolid = header && header.classList.contains('solid');

        if (isSolid) {
            // Sub-page solid header: show a compact login link in auth area
            area.innerHTML = `
                <button class="btn btn-login-link" onclick="openAuthModal('login')">Login</button>
            `;
        } else {
            // Homepage transparent header: auth area is empty, hero-login-btn handles it
            area.innerHTML = '';
            if (loginBtn) loginBtn.style.display = 'inline-flex';
        }
    }
}


/* ==========================================================================
   TICKET CONFIGURATION & QUANTITY MODIFIERS
   ========================================================================== */
function selectPackage(packageType) {
    state.selectedPackage = packageType;

    // Default tickets based on package type
    state.tickets.adult = 0;
    state.tickets.child = 0;
    state.tickets.senior = 0;

    if (packageType === 'family') {
        state.tickets.adult = 2;
        state.tickets.child = 2;
    } else if (packageType === 'school') {
        state.tickets.adult = 15;
    } else {
        state.tickets.adult = 1;
    }

    updateTicketCounters();
    recalculateCart();
    goToStep(3);
}

function adjustTicket(type, amount) {
    let targetVal = state.tickets[type] + amount;
    if (targetVal < 0) return;

    if (state.selectedPackage === 'family') {
        if (type === 'adult' && targetVal < 2) {
            alert("Family Package requires a minimum of 2 Adults.");
            return;
        }
        if (type === 'child' && targetVal < 2) {
            alert("Family Package requires a minimum of 2 Children.");
            return;
        }
    }

    state.tickets[type] = targetVal;
    updateTicketCounters();
    recalculateCart();
}

function updateTicketCounters() {
    // Step 3 counters
    document.getElementById("t-qty-adult").innerText = state.tickets.adult;
    document.getElementById("t-qty-child").innerText = state.tickets.child;
    document.getElementById("t-qty-senior").innerText = state.tickets.senior;

    // Step 4 counters
    document.getElementById("d-qty-adult").innerText = state.tickets.adult;
    document.getElementById("d-qty-child").innerText = state.tickets.child;
    document.getElementById("d-qty-senior").innerText = state.tickets.senior;
}

function validateStep3To4() {
    const total = state.tickets.adult + state.tickets.child + state.tickets.senior;
    if (total === 0) {
        alert("Please select at least 1 ticket.");
        return;
    }
    goToStep(4);
}

function validateStep4() {
    const dateVal = document.getElementById("calendar-selected-value").value;
    if (!dateVal) {
        alert("Please select a visit date.");
        return;
    }
    state.visitDate = dateVal;

    const total = state.tickets.adult + state.tickets.child + state.tickets.senior;
    if (total === 0) {
        alert("Please select at least 1 ticket.");
        return;
    }

    if (state.selectedPackage === 'school' && total < 15) {
        alert("School Trip requires a minimum of 15 group tickets.");
        return;
    }

    goToStep(5);
}

/* ==========================================================================
   CALENDAR GENERATOR
   ========================================================================== */
function renderCalendar(year, month) {
    const titleEl = document.getElementById("cal-month-title");
    const gridEl = document.getElementById("calendar-days-grid");
    if (!titleEl || !gridEl) return;

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    titleEl.innerText = `${monthNames[month]} ${year}`;
    gridEl.innerHTML = '';

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Empty cells
    for (let i = 0; i < firstDayIndex; i++) {
        const span = document.createElement("span");
        span.className = "calendar-day-btn disabled";
        gridEl.appendChild(span);
    }

    // May 2026 Days
    for (let day = 1; day <= totalDays; day++) {
        const btn = document.createElement("button");
        btn.className = "calendar-day-btn";
        btn.innerText = day;

        const dateString = `${day} ${monthNames[month]} ${year}`;
        btn.setAttribute("data-date", dateString);

        if (state.visitDate === dateString) {
            btn.classList.add("selected");
        }

        btn.addEventListener("click", () => {
            gridEl.querySelectorAll(".calendar-day-btn").forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            document.getElementById("calendar-selected-value").value = dateString;
            state.visitDate = dateString;
            recalculateCart();
        });

        gridEl.appendChild(btn);
    }
}

function adjustCalMonth(offset) {
    currentMonth += offset;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    else if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar(currentYear, currentMonth);
}

/* ==========================================================================
   ADD-ONS SYNCHRONIZATION
   ========================================================================== */
function syncCheckboxAddon(addonId) {
    const chk = document.getElementById(`chk-addon-${addonId}`);
    const sel = document.getElementById(`sel-addon-${addonId}`);
    state.addons[addonId] = chk.checked ? parseInt(sel.value) : 0;
    recalculateCart();
}

function syncDropdownAddon(addonId) {
    const chk = document.getElementById(`chk-addon-${addonId}`);
    const sel = document.getElementById(`sel-addon-${addonId}`);
    if (chk.checked) {
        state.addons[addonId] = parseInt(sel.value);
        recalculateCart();
    }
}

/* ==========================================================================
   CART CALCULATIONS & BADGE
   ========================================================================== */
function recalculateCart() {
    let ticketsCost = 0;
    const { adult, child, senior } = state.tickets;
    const totalTickets = adult + child + senior;

    if (state.selectedPackage === 'family') {
        let extraAdults = Math.max(0, adult - 2);
        let extraChildren = Math.max(0, child - 2);
        ticketsCost = PRICING.family.basePrice +
            (extraAdults * PRICING.family.extraAdult) +
            (extraChildren * PRICING.family.extraChild) +
            (senior * PRICING.family.extraSenior);
    } else if (state.selectedPackage === 'school') {
        ticketsCost = totalTickets * PRICING.school.flatRate;
    } else if (state.selectedPackage === 'vip') {
        ticketsCost = totalTickets * PRICING.vip.flatRate;
    } else if (state.selectedPackage === 'annual') {
        ticketsCost = totalTickets * PRICING.annual.flatRate;
    } else {
        ticketsCost = (adult * PRICING.standard.adult) +
            (child * PRICING.standard.child) +
            (senior * PRICING.standard.senior);
    }

    let addonsCost = 0;
    Object.keys(state.addons).forEach(key => {
        addonsCost += state.addons[key] * ADDONS_PRICING[key];
    });

    // Hotel cost
    let hotelCost = 0;
    if (state.hotel) {
        const nights = state.hotelNights[state.hotel] || 1;
        hotelCost = HOTEL_PRICING[state.hotel] * nights;
    }

    // Transport cost
    let transportCost = 0;
    if (state.transport) {
        const totalPax = totalTickets;
        if (state.transport === 'shuttle') {
            transportCost = TRANSPORT_PRICING.shuttle * Math.max(1, totalPax);
        } else {
            transportCost = TRANSPORT_PRICING[state.transport];
        }
    }

    let discountAmt = (ticketsCost * state.discountPercent) / 100;
    let grandTot = ticketsCost + addonsCost + hotelCost + transportCost - discountAmt;

    state.totals.ticketsSubtotal = ticketsCost;
    state.totals.addonsSubtotal = addonsCost + hotelCost + transportCost;
    state.totals.discountAmount = discountAmt;
    state.totals.grandTotal = grandTot;

    // Update Step 6 elements
    const dateDetail = document.getElementById("visit-details-date");
    if (dateDetail) dateDetail.innerText = state.visitDate || "-";
    const guestsDetail = document.getElementById("visit-details-guests");
    if (guestsDetail) guestsDetail.innerText = totalTickets;

    const grandLabel = document.getElementById("bill-grandtotal");
    if (grandLabel) grandLabel.innerText = `RM ${grandTot.toFixed(2)}`;

    updateHeaderCartBadge();
    renderCartSummaryTable();
}

function updateHeaderCartBadge() {
    const badge = document.getElementById("cart-badge-count");
    if (!badge) return;

    const totalQty = state.tickets.adult + state.tickets.child + state.tickets.senior;
    badge.innerText = totalQty;
}

function renderCartSummaryTable() {
    const summaryContainer = document.getElementById("summary-bill-items");
    if (!summaryContainer) return;

    summaryContainer.innerHTML = '';
    const formatCurrency = (val) => `RM ${val.toFixed(2)}`;
    const { adult, child, senior } = state.tickets;

    if (state.selectedPackage === 'family') {
        summaryContainer.innerHTML += `
            <div class="summary-bill-row">
                <span>Family Package Base Bundle (2A+2C)</span>
                <span>${formatCurrency(PRICING.family.basePrice)}</span>
            </div>
        `;
        let extraAdults = Math.max(0, adult - 2);
        let extraChildren = Math.max(0, child - 2);
        if (extraAdults > 0) {
            summaryContainer.innerHTML += `
                <div class="summary-bill-row">
                    <span>Extra Family Adult (x${extraAdults})</span>
                    <span>${formatCurrency(extraAdults * PRICING.family.extraAdult)}</span>
                </div>
            `;
        }
        if (extraChildren > 0) {
            summaryContainer.innerHTML += `
                <div class="summary-bill-row">
                    <span>Extra Family Child (x${extraChildren})</span>
                    <span>${formatCurrency(extraChildren * PRICING.family.extraChild)}</span>
                </div>
            `;
        }
        if (senior > 0) {
            summaryContainer.innerHTML += `
                <div class="summary-bill-row">
                    <span>Extra Family Senior (x${senior})</span>
                    <span>${formatCurrency(senior * PRICING.family.extraSenior)}</span>
                </div>
            `;
        }
    } else {
        if (adult > 0) {
            summaryContainer.innerHTML += `
                <div class="summary-bill-row">
                    <span>Adult Ticket (x${adult})</span>
                    <span>${formatCurrency(adult * getPackageTicketPrice('adult'))}</span>
                </div>
            `;
        }
        if (child > 0) {
            summaryContainer.innerHTML += `
                <div class="summary-bill-row">
                    <span>Child Ticket (x${child})</span>
                    <span>${formatCurrency(child * getPackageTicketPrice('child'))}</span>
                </div>
            `;
        }
        if (senior > 0) {
            summaryContainer.innerHTML += `
                <div class="summary-bill-row">
                    <span>Senior Citizen Ticket (x${senior})</span>
                    <span>${formatCurrency(senior * getPackageTicketPrice('senior'))}</span>
                </div>
            `;
        }
    }

    Object.keys(state.addons).forEach(key => {
        const qty = state.addons[key];
        if (qty > 0) {
            summaryContainer.innerHTML += `
                <div class="summary-bill-row">
                    <span>${getAddonLabel(key)} (x${qty})</span>
                    <span>${formatCurrency(qty * ADDONS_PRICING[key])}</span>
                </div>
            `;
        }
    });

    // Show hotel in cart
    if (state.hotel) {
        const nights = state.hotelNights[state.hotel] || 1;
        summaryContainer.innerHTML += `
            <div class="summary-bill-row">
                <span>🏨 ${HOTEL_LABELS[state.hotel]} (${nights} nights)</span>
                <span>${formatCurrency(HOTEL_PRICING[state.hotel] * nights)}</span>
            </div>
        `;
    }

    // Show transport in cart
    if (state.transport) {
        const totalPax = state.tickets.adult + state.tickets.child + state.tickets.senior;
        let tCost = TRANSPORT_PRICING[state.transport];
        if (state.transport === 'shuttle') tCost *= Math.max(1, totalPax);
        summaryContainer.innerHTML += `
            <div class="summary-bill-row">
                <span>🚌 ${TRANSPORT_LABELS[state.transport]}</span>
                <span>${formatCurrency(tCost)}</span>
            </div>
        `;
    }

    if (state.discountPercent > 0) {
        summaryContainer.innerHTML += `
            <div class="summary-bill-row discount-active">
                <span>Discount (20% Code Applied)</span>
                <span>-${formatCurrency(state.totals.discountAmount)}</span>
            </div>
        `;
    }
}

function getPackageTicketPrice(type) {
    if (state.selectedPackage === 'school') return PRICING.school.flatRate;
    if (state.selectedPackage === 'vip') return PRICING.vip.flatRate;
    if (state.selectedPackage === 'annual') return PRICING.annual.flatRate;
    return PRICING.standard[type];
}

function getAddonLabel(addon) {
    if (addon === 'feeding') return 'Feeding Session';
    if (addon === 'tram') return 'Tram Ride';
    if (addon === 'souvenir') return 'Souvenir Package';
    return addon;
}

/* ==========================================================================
   ACCOMMODATION & TRANSPORT SELECTION
   ========================================================================== */
const HOTEL_LABELS = { budget: 'Budget Inn', standard: 'Standard Hotel', premium: 'Premium Resort' };
const TRANSPORT_LABELS = { shuttle: 'Shuttle Bus', car: 'Private Car', limo: 'Limousine VIP' };

function selectHotel(type) {
    state.hotel = type;

    // Reset all radio dots
    ['budget', 'standard', 'premium', 'none'].forEach(k => {
        const dot = document.getElementById(`radio-hotel-${k}`);
        const card = document.getElementById(`hotel-${k}`);
        if (dot) dot.classList.remove('active');
        if (card) card.classList.remove('selected');
    });

    if (type) {
        const dot = document.getElementById(`radio-hotel-${type}`);
        const card = document.getElementById(`hotel-${type}`);
        if (dot) dot.classList.add('active');
        if (card) card.classList.add('selected');
    } else {
        const dot = document.getElementById('radio-hotel-none');
        const card = document.getElementById('hotel-none');
        if (dot) dot.classList.add('active');
        if (card) card.classList.add('selected');
    }

    recalculateCart();
    updateAccomSummaryBanner();
}

function adjustHotelNights(type, delta) {
    const newVal = Math.max(1, (state.hotelNights[type] || 1) + delta);
    state.hotelNights[type] = newVal;
    const el = document.getElementById(`nights-${type}`);
    if (el) el.innerText = newVal;
    recalculateCart();
    updateAccomSummaryBanner();
}

function selectTransport(type) {
    state.transport = type;

    // Reset all radio dots
    ['shuttle', 'car', 'limo', 'none'].forEach(k => {
        const dot = document.getElementById(`radio-transport-${k}`);
        const card = document.getElementById(`transport-${k}`);
        if (dot) dot.classList.remove('active');
        if (card) card.classList.remove('selected');
    });

    if (type) {
        const dot = document.getElementById(`radio-transport-${type}`);
        const card = document.getElementById(`transport-${type}`);
        if (dot) dot.classList.add('active');
        if (card) card.classList.add('selected');
    } else {
        const dot = document.getElementById('radio-transport-none');
        const card = document.getElementById('transport-none');
        if (dot) dot.classList.add('active');
        if (card) card.classList.add('selected');
    }

    recalculateCart();
    updateAccomSummaryBanner();
}

function updateAccomSummaryBanner() {
    const el = document.getElementById('accom-summary-text');
    if (!el) return;

    const parts = [];
    if (state.hotel) {
        const nights = state.hotelNights[state.hotel] || 1;
        const total = HOTEL_PRICING[state.hotel] * nights;
        parts.push(`🏨 ${HOTEL_LABELS[state.hotel]} × ${nights} nights = RM ${total.toFixed(2)}`);
    }
    if (state.transport) {
        const totalPax = state.tickets.adult + state.tickets.child + state.tickets.senior;
        let tCost = TRANSPORT_PRICING[state.transport];
        if (state.transport === 'shuttle') tCost *= totalPax;
        parts.push(`🚌 ${TRANSPORT_LABELS[state.transport]} = RM ${tCost.toFixed(2)}`);
    }

    el.innerHTML = parts.length
        ? `✅ ${parts.join('&nbsp;&nbsp;|&nbsp;&nbsp;')}`
        : '✅ No additional options selected';
}

function applyPromoCode() {
    const code = document.getElementById("promo-code-field").value.trim().toUpperCase();
    const statusMsg = document.getElementById("promo-status-msg");

    if (code === 'WILD20') {
        state.promoCode = code;
        state.discountPercent = 20;
        statusMsg.innerText = "Success! 20% discount code applied.";
        statusMsg.className = "promo-msg success";
        recalculateCart();
    } else if (code === '') {
        state.promoCode = '';
        state.discountPercent = 0;
        statusMsg.innerText = "";
        recalculateCart();
    } else {
        statusMsg.innerText = "Invalid promotion code. Try 'WILD20'";
        statusMsg.className = "promo-msg error";
    }
}

/* ==========================================================================
   STEP 7: LOGIN / GUEST CHECKOUT FORMS
   ========================================================================== */
function revealCheckoutForm(mode) {
    state.checkoutMode = mode;

    // Hide panel forms in drawer
    document.querySelectorAll(".checkout-form-panel").forEach(panel => {
        panel.classList.remove("active");
    });

    // Show chosen panel & wrapper drawer
    const drawer = document.getElementById("checkout-forms-container");
    drawer.classList.remove("hidden");

    document.getElementById(`form-${mode}`).classList.add("active");

    // If logged in, pre-fill form-login or skip immediately
    if (mode === 'login' && state.sessionUser) {
        document.getElementById("login-email").value = state.sessionUser.email;
        document.getElementById("login-pass").value = "password"; // Simulated
    }

    setTimeout(() => {
        drawer.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
}

function submitCheckout(event, mode) {
    event.preventDefault();

    if (mode === 'guest') {
        state.billingDetails.name = document.getElementById("guest-name").value;
        state.billingDetails.email = document.getElementById("guest-email").value;
        state.billingDetails.phone = document.getElementById("guest-phone").value;
    } else if (mode === 'login') {
        const email = document.getElementById("login-email").value.trim().toLowerCase();
        const pass = document.getElementById("login-pass").value;

        // Verify user against database
        const user = registeredUsers.find(u => u.email === email && u.pass === pass);
        if (user) {
            state.sessionUser = { name: user.name, email: user.email };
            localStorage.setItem("zoo_active_session", JSON.stringify(state.sessionUser));
            updateHeaderAuthUI();

            state.billingDetails.name = user.name;
            state.billingDetails.email = user.email;
            state.billingDetails.phone = "+6012-9908123";
        } else {
            alert("Invalid account credentials. Proceed as guest or register.");
            return;
        }
    } else if (mode === 'register') {
        const email = document.getElementById("reg-email").value.trim().toLowerCase();
        const name = document.getElementById("reg-name").value;
        const pass = document.getElementById("reg-pass").value;

        if (registeredUsers.some(u => u.email === email)) {
            alert("Email is already registered. Try logging in.");
            return;
        }

        const newUser = { name, email, pass };
        registeredUsers.push(newUser);
        localStorage.setItem("zoo_users", JSON.stringify(registeredUsers));

        state.sessionUser = { name, email };
        localStorage.setItem("zoo_active_session", JSON.stringify(state.sessionUser));
        updateHeaderAuthUI();

        state.billingDetails.name = name;
        state.billingDetails.email = email;
        state.billingDetails.phone = "+6019-8765432";
    }

    goToStep(8);
}

/* ==========================================================================
   STEP 8 & 9: PAYMENT ROUTING
   ========================================================================== */
function selectPaymentMethod(method) {
    state.paymentMethod = method;

    document.querySelectorAll(".payment-method-card").forEach(card => {
        card.classList.remove("selected");
    });
    document.getElementById(`pay-${method}`).classList.add("selected");
    document.getElementById(`rad-pay-${method}`).checked = true;

    // Drawers inputs
    document.querySelectorAll(".pay-detail-mode").forEach(panel => {
        panel.classList.remove("active");
    });
    document.getElementById(`payment-details-${method}`).classList.add("active");
}

function selectWalletProvider(element) {
    document.querySelectorAll(".wallet-select-option").forEach(opt => opt.classList.remove("selected"));
    element.classList.add("selected");
}

function triggerGateway() {
    // Validate
    if (state.paymentMethod === 'card') {
        if (!document.getElementById("card-number").value || !document.getElementById("card-expiry").value) {
            alert("Please fill in card details.");
            return;
        }
    } else if (state.paymentMethod === 'banking') {
        if (!document.getElementById("fpx-bank-select").value) {
            alert("Please select bank.");
            return;
        }
    } else if (state.paymentMethod === 'wallet') {
        if (!document.getElementById("wallet-phone").value) {
            alert("Please input phone number.");
            return;
        }
    } else {
        alert("Please choose a payment method.");
        return;
    }

    goToStep(9);

    setTimeout(() => {
        saveBookingRecord();
        goToStep(10);
    }, 2000);
}

/* ==========================================================================
   SAVE TRANSACTION (LOCAL STORAGE PERSISTENCE)
   ========================================================================== */
function saveBookingRecord() {
    const randomDigits = Math.floor(1000000 + Math.random() * 9000000);
    state.bookingId = `ZW12${randomDigits}`;

    const { adult, child, senior } = state.tickets;
    let list = [];
    if (adult > 0) list.push(`${adult} Adult`);
    if (child > 0) list.push(`${child} Child`);
    if (senior > 0) list.push(`${senior} Senior`);
    const ticketSummaryString = list.join(", ");

    const newBooking = {
        bookingId: state.bookingId,
        visitDate: state.visitDate,
        packageName: state.selectedPackage ? formatPackageName(state.selectedPackage) : "Standard Admission",
        tickets: ticketSummaryString,
        billingName: state.billingDetails.name,
        billingEmail: state.billingDetails.email,
        paidAmount: state.totals.grandTotal,
        status: "Active"
    };

    // Save to local storage array
    let bookings = JSON.parse(localStorage.getItem("zoo_bookings")) || [];
    bookings.unshift(newBooking);
    localStorage.setItem("zoo_bookings", JSON.stringify(bookings));

    // Update E-Ticket Screen details
    document.getElementById("eticket-number-val").innerText = state.bookingId;
    document.getElementById("eticket-date-val").innerText = state.visitDate;
    document.getElementById("eticket-qty-val").innerText = ticketSummaryString;

    // Inject vector QR codes
    const qrMarkup = generateQRSVGMarkup(state.bookingId);
    document.getElementById("eticket-qr-container").innerHTML = qrMarkup;
    document.getElementById("delivery-phone-qr-container").innerHTML = qrMarkup;

    // Update Email Confirmation details
    document.getElementById("delivery-email-val").innerText = state.billingDetails.email;
}

function formatPackageName(pkg) {
    if (pkg === 'family') return 'Family Package';
    if (pkg === 'school') return 'School Trip';
    if (pkg === 'vip') return 'VIP Experience';
    if (pkg === 'annual') return 'Annual Pass';
    return pkg;
}

function generateQRSVGMarkup(text) {
    return `
        <svg class="qr-svg" viewBox="0 0 100 100" fill="currentColor">
            <rect x="5" y="5" width="22" height="22" fill="none" stroke="currentColor" stroke-width="4"/>
            <rect x="11" y="11" width="10" height="10"/>
            
            <rect x="73" y="5" width="22" height="22" fill="none" stroke="currentColor" stroke-width="4"/>
            <rect x="79" y="11" width="10" height="10"/>
            
            <rect x="5" y="73" width="22" height="22" fill="none" stroke="currentColor" stroke-width="4"/>
            <rect x="11" y="79" width="10" height="10"/>
            
            <path d="M40,15h10M40,25h5v5h-5zM55,35h10v5h-10zM15,45h15M45,55h20M75,45h10v20h-10z" stroke="currentColor" stroke-width="3"/>
            <path d="M15,60h5M35,73h15M60,79h10M75,79h10" stroke="currentColor" stroke-width="3"/>
        </svg>
    `;
}

/* ==========================================================================
   MY BOOKINGS DASHBOARD PORTAL
   ========================================================================== */
function showDashboard() {
    // Close nav menus active states
    document.querySelectorAll(".main-nav a").forEach(a => a.classList.remove("active"));
    document.getElementById("nav-dashboard").classList.add("active");

    goToStep("dashboard");
    renderDashboardTable();
}

function renderDashboardTable(filterText = '') {
    const tbody = document.getElementById("dashboard-bookings-tbody");
    if (!tbody) return;

    tbody.innerHTML = '';
    const bookings = JSON.parse(localStorage.getItem("zoo_bookings")) || [];

    // Determine active account filter
    let searchTarget = filterText.trim().toLowerCase();

    // If no search input is active, but a user is logged in, show only their bookings!
    if (!searchTarget && state.sessionUser) {
        searchTarget = state.sessionUser.email.toLowerCase();
    }

    const filtered = bookings.filter(b => {
        if (!searchTarget) return true; // Show all to guest search
        return b.bookingId.toLowerCase().includes(searchTarget) ||
            b.billingEmail.toLowerCase().includes(searchTarget) ||
            b.billingName.toLowerCase().includes(searchTarget);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">No booking records found.</td></tr>`;
        return;
    }

    filtered.forEach(b => {
        const isCancelled = b.status === 'Cancelled';
        tbody.innerHTML += `
            <tr>
                <td class="booking-id-cell"><strong>${b.bookingId}</strong></td>
                <td>
                    <span class="badge-type">
                        <span class="type-icon">${b.isHotelStay ? '🏨' : '🎟️'}</span>
                        <span class="type-text">${b.isHotelStay ? 'Hotel Stay' : 'Zoo Ticket'}</span>
                    </span>
                </td>
                <td class="secondary-info-cell">${b.visitDate}</td>
                <td><strong>${b.packageName}</strong></td>
                <td class="secondary-info-cell">${b.tickets}</td>
                <td class="amount-cell">RM ${b.paidAmount.toFixed(2)}</td>
                <td><span class="badge-status ${isCancelled ? 'cancelled' : 'active'}">${b.status}</span></td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-view-action" onclick="viewTicketReceipt('${b.bookingId}')">
                            View Ticket
                        </button>
                        ${!isCancelled ? `<button class="btn-cancel-action" onclick="cancelBooking('${b.bookingId}')">Cancel</button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    });
}

function filterDashboard() {
    const input = document.getElementById("dashboard-search-input").value;
    renderDashboardTable(input);
}

function viewTicketReceipt(bookingId) {
    const bookings = JSON.parse(localStorage.getItem("zoo_bookings")) || [];
    const b = bookings.find(item => item.bookingId === bookingId);
    if (!b) return;

    const modalBody = document.getElementById("ticket-modal-body");
    const qrMarkup = generateQRSVGMarkup(b.bookingId);

    if (b.isHotelStay) {
        modalBody.innerHTML = `
            <div class="eticket-pass-card" style="text-align:left; max-width: 100%; margin: 0 auto; border: 1.5px solid var(--card-border); border-radius: 12px; overflow: hidden; background-color: #fff; box-shadow: var(--shadow-soft);">
                <div class="ticket-brand-header" style="background-color:${b.status === 'Cancelled' ? '#c62828' : '#0277BD'};">
                    <span class="brand">Zoo Adventure Partner Hotel</span>
                    <span class="ticket-lbl">${b.status.toUpperCase()}</span>
                </div>
                <div class="ticket-barcode-area">
                    <div class="qr-svg-wrapper">
                        ${qrMarkup}
                    </div>
                    <p class="barcode-instruction">Present this voucher QR at the hotel front desk during check-in.</p>
                </div>
                <div style="padding: 20px; border-top: 1px dashed #e0e5e0;">
                    <p style="font-size:12px; color:#607D8B;">BOOKING ID</p>
                    <strong>${b.bookingId}</strong>
                    <p style="font-size:12px; color:#607D8B; margin-top:10px;">HOTEL STAY</p>
                    <strong>${b.packageName}</strong>
                    <p style="font-size:12px; color:#607D8B; margin-top:10px;">CHECK-IN / CHECK-OUT</p>
                    <strong>${b.checkIn} to ${b.checkOut} (${b.nights} nights)</strong>
                    <p style="font-size:12px; color:#607D8B; margin-top:10px;">DETAILS</p>
                    <strong>${b.roomsCount} Room(s)</strong>
                    <p style="font-size:12px; color:#607D8B; margin-top:10px;">PRIMARY GUEST</p>
                    <strong>${b.billingName} (${b.billingEmail})</strong>
                </div>
            </div>
        `;
    } else {
        modalBody.innerHTML = `
            <div class="eticket-pass-card" style="text-align:left; max-width: 100%; margin: 0 auto; border: 1.5px solid var(--card-border); border-radius: 12px; overflow: hidden; background-color: #fff; box-shadow: var(--shadow-soft);">
                <div class="ticket-brand-header" style="background-color:${b.status === 'Cancelled' ? '#c62828' : '#2E7D32'};">
                    <span class="brand">Zoo Adventure</span>
                    <span class="ticket-lbl">${b.status.toUpperCase()}</span>
                </div>
                <div class="ticket-barcode-area">
                    <div class="qr-svg-wrapper">
                        ${qrMarkup}
                    </div>
                    <p class="barcode-instruction">Present this QR code for gate admission verification.</p>
                </div>
                <div style="padding: 20px; border-top: 1px dashed #e0e5e0;">
                    <p style="font-size:12px; color:#607D8B;">BOOKING ID</p>
                    <strong>${b.bookingId}</strong>
                    <p style="font-size:12px; color:#607D8B; margin-top:10px;">VISIT DATE</p>
                    <strong>${b.visitDate}</strong>
                    <p style="font-size:12px; color:#607D8B; margin-top:10px;">ADMISSIONS</p>
                    <strong>${b.tickets}</strong>
                    <p style="font-size:12px; color:#607D8B; margin-top:10px;">HOLDER</p>
                    <strong>${b.billingName} (${b.billingEmail})</strong>
                </div>
            </div>
        `;
    }

    openModal("ticket-modal");
}

function cancelBooking(bookingId) {
    if (!confirm("Are you sure you want to cancel this booking? Refund policy details will be sent to your email.")) return;

    let bookings = JSON.parse(localStorage.getItem("zoo_bookings")) || [];
    const idx = bookings.findIndex(b => b.bookingId === bookingId);
    if (idx !== -1) {
        bookings[idx].status = "Cancelled";
        localStorage.setItem("zoo_bookings", JSON.stringify(bookings));
        renderDashboardTable();
    }
}

/* ==========================================================================
   MODAL WINDOW CONTROLS
   ========================================================================== */
function openModal(modalId) {
    document.getElementById(modalId).classList.remove("hidden");
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add("hidden");
    if (modalId === "accom-detail-modal") {
        clearInterval(accomCarouselInterval);
    }
}

/* ==========================================================================
   RESET SYSTEM FLOW
   ========================================================================== */
function resetBookingFlow(targetStep = 1) {
    state.selectedPackage = null;
    state.tickets.adult = 0;
    state.tickets.child = 0;
    state.tickets.senior = 0;
    state.visitDate = '';
    state.addons.feeding = 0;
    state.addons.tram = 0;
    state.addons.souvenir = 0;
    state.hotel = null;
    state.hotelNights = { budget: 1, standard: 1, premium: 1 };
    state.transport = null;
    state.promoCode = '';
    state.discountPercent = 0;
    state.paymentMethod = null;
    state.bookingId = '';

    // Reset inputs
    document.getElementById("promo-code-field").value = '';
    document.getElementById("promo-status-msg").innerText = '';
    document.getElementById("guest-name").value = '';
    document.getElementById("guest-email").value = '';
    document.getElementById("guest-phone").value = '';
    document.getElementById("card-holder-name").value = '';
    document.getElementById("card-number").value = '';
    document.getElementById("card-expiry").value = '';
    document.getElementById("card-cvv").value = '';
    document.getElementById("fpx-bank-select").value = '';
    document.getElementById("wallet-phone").value = '';
    document.getElementById("calendar-selected-value").value = '';

    document.getElementById("chk-addon-feeding").checked = false;
    document.getElementById("chk-addon-tram").checked = false;
    document.getElementById("chk-addon-souvenir").checked = false;
    document.getElementById("sel-addon-feeding").value = "1";
    document.getElementById("sel-addon-tram").value = "1";
    document.getElementById("sel-addon-souvenir").value = "1";

    document.querySelectorAll(".payment-method-card").forEach(card => card.classList.remove("selected"));
    document.querySelectorAll("input[name='payment_choice']").forEach(rad => rad.checked = false);
    document.querySelectorAll(".pay-detail-mode").forEach(panel => panel.classList.remove("active"));
    document.getElementById("payment-details-default").classList.add("active");

    document.getElementById("checkout-forms-container").classList.add("hidden");

    renderCalendar(currentYear, currentMonth);
    updateTicketCounters();
    recalculateCart();
    goToStep(targetStep);
}

/* ==========================================================================
   HERO BACKGROUND CAROUSEL ENGINE (AUTO-PLAY)
   ========================================================================== */
let currentSlideIndex = 0;
let carouselInterval = null;

function initCarousel() {
    const slides = document.querySelectorAll(".hero-bg-slide");
    if (!slides.length) return;

    // Ensure only the first slide is active on init
    slides.forEach((slide, i) => {
        slide.classList.toggle("active", i === 0);
    });

    // Start auto slide
    startCarouselTimer();
}

function startCarouselTimer() {
    stopCarouselTimer();
    carouselInterval = setInterval(() => {
        nextHeroSlide();
    }, 5000); // 5 seconds per slide
}

function stopCarouselTimer() {
    if (carouselInterval) {
        clearInterval(carouselInterval);
    }
}

function nextHeroSlide() {
    const slides = document.querySelectorAll(".hero-bg-slide");
    if (!slides.length) return;
    currentSlideIndex = (currentSlideIndex + 1) % slides.length;
    syncHeroCarousel();
}

function setHeroSlide(index) {
    currentSlideIndex = index;
    syncHeroCarousel();
    startCarouselTimer(); // Reset timer on manual dot click
}

function syncHeroCarousel() {
    document.querySelectorAll(".hero-bg-slide").forEach((slide, i) => {
        slide.classList.toggle("active", i === currentSlideIndex);
    });
    document.querySelectorAll(".hero-dot").forEach((dot, i) => {
        dot.classList.toggle("active", i === currentSlideIndex);
    });
}

/* ==========================================================================
   STANDALONE PARTNER HOTELS DATA & ENGINE
   ========================================================================== */
const PARTNER_HOTELS = {
    capsule_nest: {
        name: "ZooNest Capsule Pods (Rental Capsule)",
        price: 35,
        distance: 1.5,
        rating: 2,
        features: ["⭐⭐", "📶 Free Wi-Fi", "❄️ Air Cond", "🥤 Shared Lounge"],
        img: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=600",
        gallery: [
            "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=800"
        ],
        detailedDesc: "Perfect for solo travelers and budget backpackers. ZooNest provides soundproofed capsule pods featuring adjustable climate control, personal reading light, USB ports, and high-speed Wi-Fi. Access to clean shared showers and a vibrant social lounge.",
        reviews: [
            { name: "Alif F.", rating: 5, text: "Sangat berbaloi! Bersih dan selesa." },
            { name: "Sarah M.", rating: 4, text: "Excellent Wi-Fi, pods are surprisingly spacious." }
        ]
    },
    single_room: {
        name: "Green View Cosy Room (Rental Room)",
        price: 50,
        distance: 1.1,
        rating: 3,
        features: ["⭐⭐⭐", "📶 Free Wi-Fi", "🚿 Hot Shower", "🧹 Daily Cleaning"],
        img: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&q=80&w=600",
        gallery: [
            "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=800"
        ],
        detailedDesc: "A private bedroom in a quiet residential area. Equipped with a comfortable queen bed, dedicated workspace, wall wardrobe, air conditioner, and private bathroom with hot shower. Shared kitchen access available.",
        reviews: [
            { name: "Tan K.", rating: 5, text: "Peaceful environment, very close to the zoo entrance." }
        ]
    },
    sweet_meadow: {
        name: "Sweet Meadow Guest Room (Rental Room)",
        price: 45,
        distance: 1.3,
        rating: 2,
        features: ["⭐⭐", "📶 Free Wi-Fi", "❄️ Ceiling Fan", "🚿 Shared Bath"],
        img: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=600",
        gallery: [
            "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&q=80&w=800"
        ],
        detailedDesc: "Charming rustic room situated on a suburban street. Features an authentic country wooden theme with a comfortable double bed, ceiling fan, and beautiful window view of the garden. Shared bathroom.",
        reviews: [
            { name: "John D.", rating: 4, text: "Cozy rustic vibes. Shared bathroom was clean." }
        ]
    },
    backpack_dorm: {
        name: "Urban Backpacker Bed (Hostel Dorm)",
        price: 25,
        distance: 2.0,
        rating: 1,
        features: ["⭐", "📶 Free Wi-Fi", "🔒 Personal Locker", "🎒 Shared Kitchen"],
        img: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&q=80&w=600",
        gallery: [
            "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&q=80&w=800"
        ],
        detailedDesc: "Social backpacker hostel bunk bed. Features locker storage, power outlets, privacy curtains, shared kitchen, and dynamic lounge areas to meet global travelers.",
        reviews: [
            { name: "Li Wei", rating: 4, text: "Super cheap and friendly crowd!" }
        ]
    },
    roar_inn: {
        name: "Roar Inn Budget Stay (Budget Hotel)",
        price: 75,
        distance: 0.9,
        rating: 3,
        features: ["⭐⭐⭐", "📶 Free Wi-Fi", "🍳 Breakfast Inc.", "🚗 Free Parking"],
        img: "https://images.unsplash.com/photo-1568495248636-6432b97bd949?auto=format&fit=crop&q=80&w=600",
        gallery: [
            "https://images.unsplash.com/photo-1568495248636-6432b97bd949?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=800"
        ],
        detailedDesc: "Roar Inn Budget Stay offers private hotel rooms at very competitive rates. Includes free hot breakfast, 24-hour reception desk, secure parking, and clean air-conditioned rooms.",
        reviews: [
            { name: "Kamal R.", rating: 4, text: "Good breakfast, simple check-in process." }
        ]
    },
    orchard_cabin: {
        name: "Orchard Villa Cabin (Homestay Cottage)",
        price: 110,
        distance: 1.9,
        rating: 3,
        features: ["⭐⭐⭐", "🏡 Entire Cabin", "🌳 Garden View", "🍳 Kitchenette"],
        img: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=600",
        gallery: [
            "https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&q=80&w=800"
        ],
        detailedDesc: "Escape to a stunning luxury wooden cabin surrounded by orchard trees and pine trees. Features high ceilings, wooden paneling, private kitchen, outdoor fireplace, and private patio with seating.",
        reviews: [
            { name: "Nor A.", rating: 5, text: "Sangat mewah dan eksklusif. Suka pemandangan luar!" }
        ]
    },
    safari_haven: {
        name: "Safari Haven Family Stay (Homestay)",
        price: 130,
        distance: 1.8,
        rating: 4,
        features: ["⭐⭐⭐⭐", "🏡 Whole House", "🍳 Kitchenette", "🧺 Washer"],
        img: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&q=80&w=600",
        gallery: [
            "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=800"
        ],
        detailedDesc: "Spacious 3-bedroom homestay house perfect for families. Includes complete cooking amenities, washer, air conditioners in all rooms, and a large living area for gathering.",
        reviews: [
            { name: "Zul Y.", rating: 5, text: "Selesa untuk famili besar, kelengkapan masak lengkap." }
        ]
    },
    metro_studio: {
        name: "Metro Studio Suite (Studio Apartment)",
        price: 95,
        distance: 1.6,
        rating: 3,
        features: ["⭐⭐⭐", "📶 Free Wi-Fi", "🛋️ Living Area", "❄️ Air Cond"],
        img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=600",
        gallery: [
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800"
        ],
        detailedDesc: "Modern studio suite inside a high-rise condominium. Features a clean layout with queen bed, kitchenette, smart TV, dining table, sofa bed, and private glass balcony.",
        reviews: [
            { name: "Jasmine S.", rating: 4, text: "Clean and modern. Building security is excellent." }
        ]
    },
    safari_oasis: {
        name: "Safari Oasis Resort (Resort Hotel)",
        price: 199,
        distance: 0.8,
        rating: 4,
        features: ["⭐⭐⭐⭐", "🏊 Pool & Slide", "🏋️ Gym Access", "🚐 Free Shuttle"],
        img: "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80&w=600",
        gallery: [
            "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=800"
        ],
        detailedDesc: "Premium safari-themed resort hotel. Indulge in state-of-the-art swimming pools with water slides, fully equipped gym access, free shuttle service to the zoo gate, and grand rooms with luxury bath tubs.",
        reviews: [
            { name: "Devi A.", rating: 5, text: "Amazing pools! My kids loved the slides and the shuttle service." }
        ]
    },
    glamp_canopy: {
        name: "The Canopy Glamping (Luxury Glamping)",
        price: 150,
        distance: 0.5,
        rating: 5,
        features: ["⭐⭐⭐⭐⭐", "🎪 Luxury Tent", "🔥 Campfire Pit", "🍳 Breakfast Inc."],
        img: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=600",
        gallery: [
            "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&q=80&w=800"
        ],
        detailedDesc: "Luxurious glamping tents located right on the edge of the forest reserve. Features comfortable plush beds inside, private campfire pits for evening relaxation, and stargazing roofs. Free premium breakfast included.",
        reviews: [
            { name: "Ahmad F.", rating: 5, text: "Best glamping experience! Beautiful stars at night." }
        ]
    }
};

function renderHotelsList(filteredHotels = Object.entries(PARTNER_HOTELS)) {
    const grid = document.getElementById("hotels-list-grid");
    if (!grid) return;
    grid.innerHTML = "";

    if (filteredHotels.length === 0) {
        grid.innerHTML = `<div class="text-center" style="grid-column: 1/-1; padding: 40px; color: var(--text-secondary);">No accommodations match your filters. Try adjusting your search query.</div>`;
        return;
    }

    filteredHotels.forEach(([key, hotel]) => {
        grid.innerHTML += `
            <div class="accom-card" id="hotel-card-${key}" onclick="openHotelDetails('${key}')">
                <div class="accom-card-img">
                    <img src="${hotel.img}" alt="${hotel.name}">
                    <div class="accom-price-badge">RM ${hotel.price} / night</div>
                </div>
                <div class="accom-card-info">
                    <div class="accom-radio-row" style="margin-bottom: 6px;">
                        <h3 style="font-size:14.5px;">${hotel.name}</h3>
                        <span class="dist-badge">${hotel.distance} km from zoo</span>
                    </div>
                    <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">Experience a wonderful stay close to nature. Curated guest privileges included.</p>
                    <div class="accom-features" style="margin-bottom: 16px;">
                        ${hotel.features.map(f => `<span>${f}</span>`).join("")}
                    </div>
                    <button class="btn btn-primary btn-block accom-book-btn" onclick="event.stopPropagation(); openHotelCheckout('${key}')">Book Now</button>
                </div>
            </div>
        `;
    });
}

function filterHotels() {
    const query = document.getElementById("hotel-search-input").value.toLowerCase().trim();
    const priceTier = document.getElementById("hotel-price-filter").value;
    const distanceLimit = document.getElementById("hotel-distance-filter").value;

    const filtered = Object.entries(PARTNER_HOTELS).filter(([key, hotel]) => {
        // Search query (matches name or features/tags)
        if (query && !hotel.name.toLowerCase().includes(query)) return false;

        // Price tier
        if (priceTier === "budget" && hotel.price >= 60) return false;
        if (priceTier === "standard" && (hotel.price < 60 || hotel.price > 150)) return false;
        if (priceTier === "luxury" && hotel.price <= 150) return false;

        // Distance limit
        if (distanceLimit === "1" && hotel.distance > 1.0) return false;
        if (distanceLimit === "2" && hotel.distance > 2.0) return false;

        return true;
    });

    renderHotelsList(filtered);
}

function openHotelCheckout(hotelKey) {
    const hotel = PARTNER_HOTELS[hotelKey];
    if (!hotel) return;

    document.getElementById("hotel-checkout-key").value = hotelKey;
    document.getElementById("modal-hotel-img").src = hotel.img;
    document.getElementById("modal-hotel-name").innerText = hotel.name;
    document.getElementById("modal-hotel-rating").innerText = "⭐".repeat(hotel.rating);
    document.getElementById("modal-hotel-distance").innerText = `${hotel.distance} km from zoo`;
    document.getElementById("modal-hotel-price").innerText = hotel.price.toFixed(2);

    // Set default dates: check-in is today, check-out is tomorrow
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    document.getElementById("hotel-check-in").value = today.toISOString().split("T")[0];
    document.getElementById("hotel-check-out").value = tomorrow.toISOString().split("T")[0];
    document.getElementById("hotel-rooms-count").value = "1";

    // Auto-populate user profile if logged in
    if (state.sessionUser) {
        document.getElementById("hotel-guest-name").value = state.sessionUser.name || "";
        document.getElementById("hotel-guest-email").value = state.sessionUser.email || "";
    } else {
        document.getElementById("hotel-guest-name").value = "";
        document.getElementById("hotel-guest-email").value = "";
    }
    document.getElementById("hotel-guest-phone").value = "";

    // Reset payment fields
    document.querySelectorAll("input[name='hotel_payment_choice']").forEach(rad => {
        rad.checked = rad.value === 'card';
    });
    toggleHotelPaymentFields();

    calculateHotelCheckoutPrice();
    openModal("hotel-checkout-modal");
}

function toggleHotelPaymentFields() {
    const chosenInput = document.querySelector("input[name='hotel_payment_choice']:checked");
    const chosen = chosenInput ? chosenInput.value : 'card';
    document.querySelectorAll(".hotel-pay-fields").forEach(el => el.classList.add("hidden"));
    
    if (chosen === 'card') {
        document.getElementById("hotel-pay-card-fields").classList.remove("hidden");
    } else if (chosen === 'fpx') {
        document.getElementById("hotel-pay-fpx-fields").classList.remove("hidden");
    } else if (chosen === 'wallet') {
        document.getElementById("hotel-pay-wallet-fields").classList.remove("hidden");
    }
}

function calculateHotelCheckoutPrice() {
    const hotelKey = document.getElementById("hotel-checkout-key").value;
    const hotel = PARTNER_HOTELS[hotelKey];
    if (!hotel) return;

    const checkInVal = document.getElementById("hotel-check-in").value;
    const checkOutVal = document.getElementById("hotel-check-out").value;
    const roomsCount = parseInt(document.getElementById("hotel-rooms-count").value) || 1;

    if (!checkInVal || !checkOutVal) {
        document.getElementById("hotel-stay-nights").innerText = "0 nights";
        document.getElementById("hotel-checkout-grand-total").innerText = "RM 0.00";
        return;
    }

    const d1 = new Date(checkInVal);
    const d2 = new Date(checkOutVal);
    const diffTime = d2 - d1;
    let nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
        nights = 0;
    }

    document.getElementById("hotel-stay-nights").innerText = `${nights} night${nights === 1 ? '' : 's'}`;

    const total = hotel.price * nights * roomsCount;
    document.getElementById("hotel-checkout-grand-total").innerText = `RM ${total.toFixed(2)}`;
}

function handleHotelCheckoutSubmit(event) {
    event.preventDefault();

    const hotelKey = document.getElementById("hotel-checkout-key").value;
    const hotel = PARTNER_HOTELS[hotelKey];
    if (!hotel) return;

    const checkInVal = document.getElementById("hotel-check-in").value;
    const checkOutVal = document.getElementById("hotel-check-out").value;
    const roomsCount = parseInt(document.getElementById("hotel-rooms-count").value) || 1;
    const guestName = document.getElementById("hotel-guest-name").value.trim();
    const guestEmail = document.getElementById("hotel-guest-email").value.trim();
    const guestPhone = document.getElementById("hotel-guest-phone").value.trim();

    const d1 = new Date(checkInVal);
    const d2 = new Date(checkOutVal);
    const diffTime = d2 - d1;
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
        alert("Check-out date must be after check-in date!");
        return;
    }

    // Validate payment details depending on choice
    const payChoiceInput = document.querySelector("input[name='hotel_payment_choice']:checked");
    const payChoice = payChoiceInput ? payChoiceInput.value : 'card';
    if (payChoice === 'card') {
        const cName = document.getElementById("hotel-card-name").value.trim();
        const cNum = document.getElementById("hotel-card-num").value.trim();
        const cExp = document.getElementById("hotel-card-expiry").value.trim();
        const cCvv = document.getElementById("hotel-card-cvv").value.trim();
        if (!cName || !cNum || !cExp || !cCvv) {
            alert("Please fill in all credit card details.");
            return;
        }
    } else if (payChoice === 'fpx') {
        const bank = document.getElementById("hotel-fpx-bank").value;
        if (!bank) {
            alert("Please select a bank for FPX payment.");
            return;
        }
    } else if (payChoice === 'wallet') {
        const phone = document.getElementById("hotel-wallet-phone").value.trim();
        if (!phone) {
            alert("Please fill in your E-wallet phone number.");
            return;
        }
    }

    // Create booking ID
    const bookingId = "HZ" + Math.floor(10000000 + Math.random() * 90000000);
    const totalAmount = hotel.price * nights * roomsCount;

    // Create new booking record
    const newBooking = {
        bookingId: bookingId,
        visitDate: checkInVal, // Using check-in date as visitDate reference
        checkIn: checkInVal,
        checkOut: checkOutVal,
        packageName: `${hotel.name}`,
        roomsCount: roomsCount,
        nights: nights,
        tickets: `${roomsCount} Room(s), ${nights} Night(s)`,
        billingName: guestName,
        billingEmail: guestEmail,
        billingPhone: guestPhone,
        paidAmount: totalAmount,
        status: "Active",
        isHotelStay: true
    };

    // Save to database
    const bookings = JSON.parse(localStorage.getItem("zoo_bookings")) || [];
    bookings.unshift(newBooking);
    localStorage.setItem("zoo_bookings", JSON.stringify(bookings));

    // Close modal
    closeModal("hotel-checkout-modal");

    // Populate and open custom hotel success modal
    document.getElementById("success-hotel-name").innerText = hotel.name;
    document.getElementById("success-hotel-booking-id").innerText = bookingId;
    openModal("hotel-success-modal");
}

let currentAccomSlideIndex = 0;
let currentAccomGallery = [];
let accomCarouselInterval = null;

function openHotelDetails(hotelKey) {
    const hotel = PARTNER_HOTELS[hotelKey];
    if (!hotel) return;

    document.getElementById("modal-accom-detail-name").innerText = hotel.name;
    document.getElementById("modal-accom-detail-desc").innerText = hotel.detailedDesc || "No description available.";
    document.getElementById("modal-accom-detail-price").innerText = hotel.price.toFixed(2);
    document.getElementById("modal-accom-detail-dist").innerText = `${hotel.distance} km from zoo`;
    document.getElementById("modal-accom-detail-stars").innerText = "⭐".repeat(hotel.rating);
    document.getElementById("modal-accom-detail-key").value = hotelKey;

    // Initialize gallery list
    currentAccomGallery = hotel.gallery || [hotel.img];
    currentAccomSlideIndex = 0;

    // Load Gallery images in slides
    const slidesContainer = document.getElementById("accom-carousel-slides");
    slidesContainer.innerHTML = currentAccomGallery.map((url, i) => `
        <div class="accom-slide" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: ${i === 0 ? 1 : 0}; transition: opacity 0.4s ease-in-out; z-index: ${i === 0 ? 2 : 1};">
            <img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">
        </div>
    `).join("");

    // Load Dots
    const dotsContainer = document.getElementById("accom-carousel-dots");
    dotsContainer.innerHTML = currentAccomGallery.map((_, i) => `
        <span class="accom-dot" onclick="setAccomCarouselSlide(${i})" style="width: 8px; height: 8px; border-radius: 50%; background-color: ${i === 0 ? '#fff' : 'rgba(255,255,255,0.5)'}; cursor: pointer; transition: all 0.2s; transform: ${i === 0 ? 'scale(1.2)' : 'scale(1)'};"></span>
    `).join("");

    // Load Reviews
    const reviewsContainer = document.getElementById("modal-accom-detail-reviews");
    reviewsContainer.innerHTML = "";
    if (hotel.reviews && hotel.reviews.length > 0) {
        hotel.reviews.forEach(r => {
            reviewsContainer.innerHTML += `
                <div style="background-color: #f7f9f7; padding: 10px 12px; border-radius: 8px; border-left: 3px solid var(--primary-color);">
                    <div class="flex-row justify-between" style="margin-bottom: 4px;">
                        <strong style="font-size:12.5px;">${r.name}</strong>
                        <span style="color: #FFB300; font-size: 11px;">${"⭐".repeat(r.rating)}</span>
                    </div>
                    <p style="font-size:12px; color: var(--text-secondary); line-height: 1.4; margin: 0;">"${r.text}"</p>
                </div>
            `;
        });
    } else {
        reviewsContainer.innerHTML = `<p style="font-size:12px; color: var(--text-muted); font-style: italic;">No reviews yet.</p>`;
    }

    // Start Autoplay timer (slides every 3 seconds)
    resetAccomCarouselTimer();

    openModal("accom-detail-modal");
}

function resetAccomCarouselTimer() {
    clearInterval(accomCarouselInterval);
    accomCarouselInterval = setInterval(() => {
        shiftAccomCarousel(1);
    }, 3000);
}

function shiftAccomCarousel(direction, isManual = false) {
    const slides = document.querySelectorAll(".accom-slide");
    if (!slides.length) return;

    currentAccomSlideIndex = (currentAccomSlideIndex + direction + slides.length) % slides.length;
    syncAccomCarousel();

    if (isManual) {
        resetAccomCarouselTimer();
    }
}

function setAccomCarouselSlide(index) {
    currentAccomSlideIndex = index;
    syncAccomCarousel();
    resetAccomCarouselTimer();
}

function syncAccomCarousel() {
    const slides = document.querySelectorAll(".accom-slide");
    const dots = document.querySelectorAll(".accom-dot");

    slides.forEach((slide, i) => {
        if (i === currentAccomSlideIndex) {
            slide.style.opacity = "1";
            slide.style.zIndex = "2";
        } else {
            slide.style.opacity = "0";
            slide.style.zIndex = "1";
        }
    });

    dots.forEach((dot, i) => {
        if (i === currentAccomSlideIndex) {
            dot.style.backgroundColor = "#fff";
            dot.style.transform = "scale(1.2)";
        } else {
            dot.style.backgroundColor = "rgba(255,255,255,0.5)";
            dot.style.transform = "scale(1)";
        }
    });
}
