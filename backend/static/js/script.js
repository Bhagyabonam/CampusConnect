// Global Variables
let currentUser = null;
// In-memory state — initialized from PostgreSQL backend
let events = [];
let wishlist = [];
let registrations = [];
// Set of event IDs the current user has registered for (authoritative from server)
let registeredEventIds = new Set();
let currentSlideIndex = 0;
// Coordinator Home filters
let coordinatorHomeStatus = 'active'; // active = upcoming + ongoing
let coordinatorHomeCategory = '';

// Sub-club details are loaded dynamically from MySQL for public club pages.
const subClubDetails = {};

async function loadClubPageFromDatabase() {
    const clubSection = document.getElementById('club-detail');
    if (!clubSection) return false;

    const clubSlug = clubSection.dataset.clubSlug;
    if (!clubSlug) return false;

    const subClubsGrid = document.getElementById('clubSubClubsGrid') || clubSection.querySelector('.sub-clubs-grid');
    const messageEl = document.getElementById('clubSubClubsMessage');
    if (!subClubsGrid) return false;

    if (messageEl) {
        messageEl.textContent = 'Loading clubs from database...';
        messageEl.style.display = 'block';
    }

    try {
        const response = await fetch(`/api/club-content?slug=${encodeURIComponent(clubSlug)}`);
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(body.error || 'Failed to load club content from database');
        }

        const club = body.club || {};
        const subClubs = Array.isArray(body.sub_clubs) ? body.sub_clubs : [];

        const titleEl = clubSection.querySelector('.container > h2');
        const imageEl = clubSection.querySelector('.club-main-image');
        const descriptionEl = clubSection.querySelector('.club-description');

        if (titleEl && club.name) {
            titleEl.textContent = club.name;
        }

        if (imageEl && club.hero_image_url) {
            imageEl.src = club.hero_image_url;
            imageEl.alt = `${club.name || 'Club'} Image`;
        }

        if (descriptionEl && club.description) {
            descriptionEl.textContent = club.description;
        }

        Object.keys(subClubDetails).forEach(key => delete subClubDetails[key]);
        subClubs.forEach(item => {
            const key = item.subclub_key;
            if (!key) return;
            subClubDetails[key] = {
                title: item.title || '',
                description: item.full_description || item.short_description || '',
                members: item.members || 'Open Membership',
                activities: item.activities || 'Club activities will be updated soon.',
                imageUrl: item.image_url || ''
            };
        });

        subClubsGrid.innerHTML = subClubs.map(item => `
            <div class="sub-club-card">
                <img src="${item.image_url || ''}" alt="${item.title || 'Sub Club'}" class="card-thumb">
                <div class="card-body">
                    <h4>${item.title || ''}</h4>
                    <p>${item.short_description || ''}</p>
                    <button class="cta-button sub-club-detail-button" data-club="${item.subclub_key}">View Details</button>
                </div>
            </div>
        `).join('');

        if (messageEl) {
            if (subClubs.length === 0) {
                messageEl.textContent = 'No sub-clubs found in database for this club.';
                messageEl.style.display = 'block';
            } else {
                messageEl.style.display = 'none';
            }
        }
    } catch (error) {
        subClubsGrid.innerHTML = '';
        if (messageEl) {
            messageEl.textContent = `Unable to load club content from database: ${error.message}`;
            messageEl.style.display = 'block';
        }
        return false;
    }

    if (document.getElementById('subClubDetailModal')) {
        initializeSubClubModals();
    }
    return true;
}

// Load registrations for the current user from the server and populate local state
async function loadRegistrationsForCurrentUser() {
    registeredEventIds = new Set();
    registrations = [];
    const user = window.currentUser || currentUser;
    console.debug('loadRegistrationsForCurrentUser start, user:', user);
    if (!user || !user.student_number) {
        console.debug('loadRegistrationsForCurrentUser aborted: no user or student_number');
        return;
    }

    try {
        const resp = await fetch(`/api/registrations/${encodeURIComponent(user.student_number)}`);
        if (!resp.ok) return;
        const regs = await resp.json();
        console.debug('loadRegistrationsForCurrentUser: fetched regs from server:', regs);
        // Normalize and store
        registrations = (regs || []).map(r => ({
            eventId: Number(r.id || r.event_id || r.eventId),
            eventTitle: r.title || r.event_title || r.eventTitle,
            registeredAt: r.registered_at || r.registeredAt || null,
            userEmail: user.email || null
        })).filter(Boolean);

        registrations.forEach(r => {
            if (r.eventId) registeredEventIds.add(Number(r.eventId));
        });
        console.debug('loadRegistrationsForCurrentUser: normalized registrations:', registrations);
        console.debug('loadRegistrationsForCurrentUser: registeredEventIds:', Array.from(registeredEventIds));
    } catch (e) {
        console.warn('Failed to load registrations for user', e);
    }
}

// Demo Events Data
const demoEvents = [
    {
        id: 1,
        title: "Tech Workshop: Web Development",
        category: "workshop",
        date: "2024-12-15",
        time: "14:00",
        location: "Computer Lab 101",
        description: "Learn the fundamentals of web development including HTML, CSS, and JavaScript. Perfect for beginners!",
        bannerUrl: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        formLink: "https://forms.google.com/example1",
        coordinator: "coordinator@college.edu",
        clubName: "Tech Club",
        status: "approved",
        createdAt: "2024-12-01T10:00:00Z",
        rejectionReason: null
    },
    {
        id: 2,
        title: "Cultural Festival 2024",
        category: "cultural",
        date: "2024-12-20",
        time: "18:00",
        location: "Main Auditorium",
        description: "Celebrate diversity through music, dance, and art from around the world.",
        bannerUrl: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        formLink: "https://forms.google.com/example2",
        coordinator: "coordinator@college.edu",
        clubName: "Cultural Club",
        status: "pending",
        createdAt: "2024-12-05T14:30:00Z",
        rejectionReason: null
    },
    {
        id: 3,
        title: "Career Fair 2025",
        category: "academic",
        date: "2025-01-10",
        time: "10:00",
        location: "Student Center",
        description: "Connect with top employers and explore career opportunities in various fields.",
        bannerUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9e1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        formLink: "https://forms.google.com/example3",
        coordinator: "coordinator@college.edu",
        clubName: "Career Development Club",
        status: "approved",
        createdAt: "2024-12-03T09:15:00Z",
        rejectionReason: null
    }
];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setFooterVisibilityForPublicHome();

    // Initialize slideshow for home page
    if (document.querySelector('.slideshow-container')) {
        initializeSlideshow();
        initializeEventListeners();
        showSlide(0);
    }

    // Initialize login page
    if (document.getElementById('loginForm')) {
        initializeLoginPage();
    }

    // Initialize dashboards
    if (document.querySelector('.dashboard-page')) {
        // Ensure server-side user (or runtime) is loaded before dashboard init
        fetchCurrentUser().then(() => initializeDashboard());
    }

    // Load data from backend (PostgreSQL only)
    loadDataFromBackend().then(remoteLoaded => {
        if (!remoteLoaded) {
            console.error('Backend is unavailable. Please ensure the server is running.');
            return;
        }
        // After data ready, load appropriate UI pieces
        if (document.getElementById('publicEventsGrid')) {
            loadPublicEvents();
        }
        if (document.querySelector('.dashboard-page')) {
            initializeDashboard();
        }
    }).catch(err => {
        console.error('Error loading backend data:', err);
    });

    // Load public events on home page
    if (document.getElementById('publicEventsGrid')) {
        loadPublicEvents();
    }

    // Load home gallery images from MySQL
    if (document.getElementById('homeGalleryGrid')) {
        loadHomeGalleryFromDatabase();
    }

    // Load public club page content from MySQL and initialize modal handlers
    if (document.getElementById('subClubDetailModal')) {
        loadClubPageFromDatabase().then(loaded => {
            if (!loaded) initializeSubClubModals();
        });
    }
}

function setFooterVisibilityForPublicHome() {
    const footer = document.querySelector('.footer');
    if (!footer) return;

    const path = window.location.pathname.toLowerCase();
    const isHomePage = path.endsWith('/index.html') || path === '/' || path.endsWith('/');

    footer.style.display = isHomePage ? '' : 'none';
}

async function loadHomeGalleryFromDatabase() {
    const grid = document.getElementById('homeGalleryGrid');
    const messageEl = document.getElementById('homeGalleryMessage');
    if (!grid) return;

    if (messageEl) {
        messageEl.textContent = 'Loading gallery from database...';
        messageEl.style.display = 'block';
    }

    try {
        const response = await fetch('/api/gallery-images');
        const images = await response.json().catch(() => []);

        if (!response.ok) {
            const errorMessage = (images && images.error) ? images.error : 'Failed to load gallery images.';
            throw new Error(errorMessage);
        }

        if (!Array.isArray(images) || images.length === 0) {
            grid.innerHTML = '';
            if (messageEl) {
                messageEl.textContent = 'No gallery images available in database.';
                messageEl.style.display = 'block';
            }
            return;
        }

        grid.innerHTML = images.map(image => `
            <div class="gallery-item">
                <img src="${image.image_url}" alt="${image.title || 'Gallery Image'}">
            </div>
        `).join('');

        if (messageEl) {
            messageEl.style.display = 'none';
        }
    } catch (error) {
        grid.innerHTML = '';
        if (messageEl) {
            messageEl.textContent = `Unable to load gallery: ${error.message}`;
            messageEl.style.display = 'block';
        }
    }
}

// Cross-tab notifications via localStorage were removed per project policy.
// If cross-tab sync is required, implement server-side push (WebSocket) or polling.

// --------------- Backend sync helpers ---------------
const API_BASE = '';
let saveScheduled = false;
function loadDataFromBackend() {
    return fetch(API_BASE + '/api/data')
        .then(r => {
            if (!r.ok) throw new Error('no-backend');
            return r.json();
        })
        .then(data => {
            // Normalize ints to numbers
            events = (data.events || []).map(e => ({ ...e, id: Number(e.id) }));
            wishlist = (data.wishlist || []).map(w => ({ ...w, eventId: Number(w.eventId) }));
            registrations = (data.registrations || []).map(r => ({ ...r, eventId: Number(r.eventId) }));
            console.log('Loaded data from backend:', events.length, wishlist.length, registrations.length);
            return true;
        })
        .catch(err => {
            console.error('Backend not available. Please ensure PostgreSQL is running and the server is connected.');
            return false;
        });
}

function scheduleSaveToBackend(delay = 500) {
    if (saveScheduled) return;
    saveScheduled = true;
    setTimeout(() => {
        saveScheduled = false;
        saveAllToBackend();
    }, delay);
}

function saveAllToBackend() {
    const payload = {
        events: events,
        wishlist: wishlist.map(w => ({ eventId: w.eventId, userEmail: w.userEmail, addedAt: w.addedAt })),
        registrations: registrations.map(r => ({ eventId: r.eventId, userEmail: r.userEmail, registeredAt: r.registeredAt, eventTitle: r.eventTitle }))
    };

    return fetch(API_BASE + '/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(r => {
        if (!r.ok) throw new Error('failed-save');
        console.log('Saved data to PostgreSQL');
        // Cross-tab notification removed (no client storage).
    }).catch(err => {
        console.error('Failed saving to database:', err);
    });
}

// ==================== SUB-CLUB MODAL FUNCTIONALITY ====================

function initializeSubClubModals() {
    const subClubDetailButtons = document.querySelectorAll('.sub-club-detail-button');
    subClubDetailButtons.forEach(button => {
        button.onclick = function() {
            const clubId = this.dataset.club;
            openSubClubModal(clubId);
        };
    });

    const modal = document.getElementById('subClubDetailModal');
    if (!modal) return;
    const closeButton = modal.querySelector('.close-button');
    if (closeButton) {
        closeButton.onclick = closeSubClubModal;
    }
}

function openSubClubModal(clubId) {
    const modal = document.getElementById('subClubDetailModal');
    const club = subClubDetails[clubId];

    if (club) {
        const modalContent = modal.querySelector('.modal-content');
        modalContent.innerHTML = `
            <span class="close-button">&times;</span>
            <img src="${club.imageUrl}" alt="${club.title} Image" class="sub-club-modal-image">
            <h3 id="modalClubTitle">${club.title}</h3>
            <p id="modalClubDescription">${club.description}</p>
            <p id="modalClubMembers"><strong>Members:</strong> ${club.members}</p>
            <p id="modalClubActivities"><strong>Activities:</strong> ${club.activities}</p>
        `;
        modal.style.display = 'block';

        // Re-attach close event listener for the new close button
        const closeButton = modal.querySelector('.close-button');
        if (closeButton) {
            closeButton.onclick = closeSubClubModal;
        }
    }
}

function closeSubClubModal() {
    document.getElementById('subClubDetailModal').style.display = 'none';
}

// ==================== SLIDESHOW FUNCTIONALITY ====================

function initializeSlideshow() {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    const totalSlides = slides.length;

    if (totalSlides > 0) {
        setInterval(nextSlide, 3000);
    }
}

function showSlide(index) {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    const totalSlides = slides.length;

    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));

    if (slides[index]) {
        slides[index].classList.add('active');
    }
    if (dots[index]) {
        dots[index].classList.add('active');
    }

    currentSlideIndex = index;
}

function nextSlide() {
    const slides = document.querySelectorAll('.slide');
    const totalSlides = slides.length;
    currentSlideIndex = (currentSlideIndex + 1) % totalSlides;
    showSlide(currentSlideIndex);
}

function prevSlide() {
    const slides = document.querySelectorAll('.slide');
    const totalSlides = slides.length;
    currentSlideIndex = (currentSlideIndex - 1 + totalSlides) % totalSlides;
    showSlide(currentSlideIndex);
}

function currentSlide(index) {
    showSlide(index - 1);
}

// ==================== LOGIN FUNCTIONALITY ====================

function initializeLoginPage() {
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', handleLogin);

    // Signup modal handlers
    const signupModal = document.getElementById('signupModal');
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    // Close modal when clicking outside will be handled by the global click handler
}
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const role = formData.get('role');
    const email = formData.get('email');
    const password = formData.get('password');
    // Basic validation
    if (!role || !email || !password) {
        showLoginMessage('Please fill in all fields.', 'error');
        return;
    }

    try {
        const resp = await fetch('/auth/login', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            showLoginMessage(result.error || 'Login failed', 'error');
            return;
        }

        // Ensure server-side session is established and fetch authoritative user
        showLoginMessage('Login successful! Finalizing session...', 'success');
        await fetchCurrentUser();

        // Redirect based on role
        setTimeout(() => {
            switch(currentUser.role) {
                case 'student':
                    window.location.href = 'student-dashboard.html';
                    break;
                case 'student-coordinator':
                    window.location.href = 'student-coordinator-dashboard.html';
                    break;
                case 'faculty-coordinator':
                    window.location.href = 'faculty-dashboard.html';
                    break;
                default:
                    window.location.href = 'index.html';
            }
        }, 800);
    } catch (e) {
        console.error('Login error', e);
        showLoginMessage('Network error. Please try again.', 'error');
    }
}

function showLoginMessage(message, type) {
    const loginMessage = document.getElementById('loginMessage');
    loginMessage.textContent = message;
    loginMessage.className = `login-message ${type}`;
    
    setTimeout(() => {
        loginMessage.textContent = '';
        loginMessage.className = 'login-message';
    }, 5000);
}

// Demo modal functions
function showDemoInfo() {
    // legacy demo function removed
}

function closeDemoInfo() {
    // legacy demo function removed
}

function showSignupModal() {
    const modal = document.getElementById('signupModal');
    if (modal) modal.style.display = 'block';
}

function closeSignupModal() {
    const modal = document.getElementById('signupModal');
    if (modal) modal.style.display = 'none';
}

async function handleSignup(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const studentNumber = formData.get('studentNumber');
    const email = formData.get('email');
    const name = formData.get('name');

    if (!studentNumber || !email) {
        const msg = document.getElementById('signupMessage');
        if (msg) { msg.textContent = 'Please provide student number and email.'; msg.className='login-message error'; }
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        const msg = document.getElementById('signupMessage');
        if (msg) { msg.textContent = 'Please enter a valid email address.'; msg.className='login-message error'; }
        return;
    }

    // Create student account
    try {
        const response = await fetch('/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_number: studentNumber, email, name })
        });

        if (response.status === 201) {
            // Account created successfully
            const respBody = await response.json().catch(() => ({}));
            currentUser = respBody.user || { role: 'student', email };
            window.currentUser = currentUser;
            const msg = document.getElementById('signupMessage');
            if (msg) { msg.textContent = 'Account created. Redirecting...'; msg.className='login-message success'; }
            setTimeout(() => { window.location.href = 'student-dashboard.html'; }, 800);
        } else if (response.status === 409) {
            // Email or student number already exists
            const msg = document.getElementById('signupMessage');
            if (msg) { msg.textContent = 'Email or student number already exists.'; msg.className='login-message error'; }
        } else {
            // Other error
            let parsed = null;
            try {
                parsed = await response.json();
            } catch (e) {
                // ignore
            }
            const msg = document.getElementById('signupMessage');
            if (msg) {
                if (parsed && parsed.error) {
                    msg.textContent = parsed.error;
                } else {
                    msg.textContent = `Failed to create account (status ${response.status})`;
                }
                msg.className='login-message error';
            }
        }
    } catch (error) {
        console.error('Error creating student account:', error);
        const msg = document.getElementById('signupMessage');
        if (msg) { msg.textContent = 'Server error. Please try again.'; msg.className='login-message error'; }
    }
}

// ==================== DASHBOARD FUNCTIONALITY ====================

async function initializeDashboard() {
    // Ensure runtime `currentUser` is loaded (try fetch if missing)
    if (!currentUser) {
        await fetchCurrentUser();
    }
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    // Ensure backend data is loaded before rendering dashboards so
    // registrations and events align (avoids race conditions).
    try {
        const loaded = await loadDataFromBackend();
        if (!loaded) {
            console.warn('initializeDashboard: backend data not loaded');
        }
    } catch (e) {
        console.warn('initializeDashboard: loadDataFromBackend error', e);
    }

    // Load authoritative registration state from server after events are available
    await loadRegistrationsForCurrentUser();

    updateUserInterface();

    // Initialize based on current page
    const currentPage = window.location.pathname.split('/').pop();
    switch(currentPage) {
        case 'student-dashboard.html':
            initializeStudentDashboard();
            break;
        case 'student-coordinator-dashboard.html':
            initializeCoordinatorDashboard();
            break;
        case 'faculty-dashboard.html':
            initializeFacultyDashboard();
            break;
    }
}

// Fetch current user from server or rely on runtime value
async function fetchCurrentUser() {
    if (currentUser) {
        window.currentUser = currentUser;
        return currentUser;
    }

    try {
        const resp = await fetch('/auth/me', { credentials: 'include' });
        if (!resp.ok) return null;
        const user = await resp.json();
        currentUser = user;
        window.currentUser = user;
        return user;
    } catch (e) {
        return null;
    }
}

function updateUserInterface() {
    const userNameElement = document.getElementById('userName');
    if (!userNameElement) return;
    const user = window.currentUser || currentUser;
    if (user && user.name) {
        userNameElement.textContent = user.name;
        return;
    }
    if (user && user.email) {
        const emailUsername = user.email.split('@')[0];
        userNameElement.textContent = emailUsername;
        return;
    }
    if (user && user.role) {
        userNameElement.textContent = user.role.replace('-', ' ');
        return;
    }
    userNameElement.textContent = 'User';
}

async function logout() {
    try {
        await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
        console.warn('Logout request failed', e);
    }
    currentUser = null;
    window.currentUser = null;
    window.location.href = 'index.html';
}

// ==================== STUDENT DASHBOARD ====================

function initializeStudentDashboard() {
    loadStudentEvents();
    updateStudentStats();
    
    // Add event listeners
    const searchInput = document.getElementById('searchEvents');
    const categoryFilter = document.getElementById('categoryFilter');
    const dateFilter = document.getElementById('dateFilter');
    
    if (searchInput) searchInput.addEventListener('input', filterEvents);
    if (categoryFilter) categoryFilter.addEventListener('change', filterEvents);
    if (dateFilter) dateFilter.addEventListener('change', filterEvents);
}

function loadStudentEvents() {
    const approvedEvents = events.filter(event => event.status === 'approved');
    renderEvents(approvedEvents, 'eventsContainer', true);
    updateStudentStats();
}

function updateStudentStats() {
    const approvedEvents = events.filter(event => event.status === 'approved');
    const userRegistrations = registrations.filter(reg => reg.userEmail === currentUser.email);
    const userWishlist = wishlist.filter(item => item.userEmail === currentUser.email);
    
    const totalEventsElement = document.getElementById('totalEvents');
    const registeredEventsElement = document.getElementById('registeredEvents');
    const wishlistEventsElement = document.getElementById('wishlistEvents');
    
    if (totalEventsElement) totalEventsElement.textContent = approvedEvents.length;
    if (registeredEventsElement) registeredEventsElement.textContent = userRegistrations.length;
    if (wishlistEventsElement) wishlistEventsElement.textContent = userWishlist.length;
}

function filterEvents() {
    const searchTerm = document.getElementById('searchEvents')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const dateFilter = document.getElementById('dateFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    
    let filteredEvents = events.filter(event => event.status === 'approved');
    
    // Search filter
    if (searchTerm) {
        filteredEvents = filteredEvents.filter(event => 
            event.title.toLowerCase().includes(searchTerm) ||
            event.description.toLowerCase().includes(searchTerm) ||
            event.clubName.toLowerCase().includes(searchTerm)
        );
    }
    
    // Category filter
    if (categoryFilter) {
        filteredEvents = filteredEvents.filter(event => event.category === categoryFilter);
    }
    
    // Date filter
    if (dateFilter) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        filteredEvents = filteredEvents.filter(event => {
            const eventDate = new Date(event.date);
            switch(dateFilter) {
                case 'today':
                    return eventDate.toDateString() === today.toDateString();
                case 'week':
                    return eventDate >= today && eventDate <= nextWeek;
                case 'month':
                    return eventDate >= today && eventDate <= nextMonth;
                case 'upcoming':
                    return eventDate > today;
                case 'ongoing':
                    return eventDate.toDateString() === today.toDateString();
                case 'completed':
                    return eventDate < today;
                default:
                    return true;
            }
        });
    }
    
    // Status filter (for student view - upcoming, ongoing, completed)
    if (statusFilter) {
        const today = new Date();
        filteredEvents = filteredEvents.filter(event => {
            const eventDate = new Date(event.date);
            switch(statusFilter) {
                case 'upcoming':
                    return eventDate > today;
                case 'ongoing':
                    return eventDate.toDateString() === today.toDateString();
                case 'completed':
                    return eventDate < today;
                default:
                    return true;
            }
        });
    }
    
    renderEvents(filteredEvents, 'eventsContainer', true);
}

function renderEvents(events, containerId, showStudentActions = false) {
    const container = document.getElementById(containerId);
    const noEvents = document.getElementById('noEvents'); // Assuming 'noEvents' is a generic ID for no events message

    if (!container) {
        console.error(`Container with ID '${containerId}' not found.`);
        return;
    }
    
    if (events.length === 0) {
        container.style.display = 'none';
        if (noEvents) noEvents.style.display = 'block';
        return;
    }
    
    container.style.display = 'grid';
    if (noEvents) noEvents.style.display = 'none';
    
    container.innerHTML = events.map(event => {
        let studentActionsHtml = '';
        if (showStudentActions && currentUser) {
            const isWishlisted = wishlist.some(item => 
                item.eventId === event.id && item.userEmail === currentUser.email
            );
            const isRegistered = registrations.some(reg => 
                reg.eventId === event.id && reg.userEmail === currentUser.email
            );

            studentActionsHtml = `
                <div class="event-header">
                    <h3>${event.title}</h3>
                    <button onclick="event.stopPropagation(); toggleWishlist(${event.id})" class="wishlist-btn ${isWishlisted ? 'wishlisted' : ''}">
                        <span>${isWishlisted ? '❤️' : '🤍'}</span>
                    </button>
                </div>
                <p><strong>Club:</strong> ${event.clubName}</p>
                <p>${event.description.substring(0, 100)}...</p>
                <div class="event-meta">
                    <span class="event-date">${formatDate(event.date)}</span>
                    <span class="event-category">${event.category}</span>
                </div>
                ${isRegistered ? '<span class="registered-badge">Registered</span>' : ''}
            `;
        } else {
            studentActionsHtml = `
                <h3>${event.title}</h3>
                <p>${event.description.substring(0, 100)}...</p>
                <div class="event-meta">
                    <span class="event-date">${formatDate(event.date)}</span>
                    <span class="event-category">${event.category}</span>
                </div>
            `;
        }
            
        return `
            <div class="event-card" onclick="openEventModal(${event.id})">
                <img src="${event.bannerUrl || 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}" alt="${event.title}">
                <div class="event-card-content">
                    ${studentActionsHtml}
                </div>
            </div>
        `;
    }).join('');
}

function toggleWishlist(eventId) {
    const existingIndex = wishlist.findIndex(item => 
        item.eventId === eventId && item.userEmail === currentUser.email
    );
    
    if (existingIndex !== -1) {
        wishlist.splice(existingIndex, 1);
        showNotification('Removed from wishlist', 'success');
    } else {
        wishlist.push({
            eventId: eventId,
            userEmail: currentUser.email,
            addedAt: new Date().toISOString()
        });
        showNotification('Added to wishlist', 'success');
    }
    
    saveWishlist();
    updateStudentStats();
    
    // Refresh the current view
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage === 'student-dashboard.html') {
        loadStudentEvents();
    } else if (currentPage === 'student-coordinator-dashboard.html') {
        renderCoordinatorHome();
        loadWishlistForCoordinator();
    }
}

function registerForEvent(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    // Prevent duplicate registration (authoritative check against server-backed set)
    if (registeredEventIds.has(Number(eventId))) {
        showNotification('You are already registered for this event', 'error');
        return;
    }

    // Call server to register
    const user = window.currentUser || currentUser;
    if (!user || !user.student_number) {
        showNotification('Please login to register for events', 'error');
        return;
    }

    (async () => {
        try {
            const resp = await fetch('/api/registrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_number: user.student_number, event_id: eventId })
            });

            const body = await resp.json().catch(() => ({}));
            if (!resp.ok) {
                showNotification(body.error || 'Failed to register for event', 'error');
                return;
            }

            // Update local state from server response by reloading registrations
            await loadRegistrationsForCurrentUser();
            updateStudentStats();
            showNotification('Successfully registered for event!', 'success');

            // Open registration form in new tab
            window.open(event.formLink || event.form_link, '_blank');

            // Refresh coordinator views if needed
            const currentPage = window.location.pathname.split('/').pop();
            if (currentPage === 'student-coordinator-dashboard.html') {
                loadHistoryForCoordinator();
            }
        } catch (e) {
            console.error('Registration failed', e);
            showNotification('Failed to register for event', 'error');
        }
    })();
}

function openEventModal(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    
    const isRegistered = registeredEventIds.has(Number(eventId));
    
    const modal = document.getElementById('eventModal');
    const content = document.getElementById('eventModalContent');
    
    content.innerHTML = `
        <div class="event-modal-body">
            <img src="${event.bannerUrl || 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}" alt="${event.title}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 10px; margin-bottom: 20px;">
            <h3>${event.title}</h3>
            <div class="event-details">
                <p><strong>Club:</strong> ${event.clubName}</p>
                <p><strong>Date:</strong> ${formatDate(event.date)} at ${event.time}</p>
                <p><strong>Location:</strong> ${event.location}</p>
                <p><strong>Category:</strong> ${event.category}</p>
                <p><strong>Description:</strong> ${event.description}</p>
            </div>
            <div class="event-actions">
                ${isRegistered ? 
                    '<span class="registered-badge">Already Registered</span>' :
                    `<button onclick="registerForEvent(${event.id})" class="btn-primary">Register for Event</button>`
                }
                <button onclick="toggleWishlist(${event.id})" class="btn-secondary">
                    ${wishlist.some(item => item.eventId === event.id && item.userEmail === currentUser.email) ? 'Remove from Wishlist' : 'Add to Wishlist'}
                </button>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

function closeEventModal() {
    document.getElementById('eventModal').style.display = 'none';
}

function closeRegistrationModal() {
    document.getElementById('registrationModal').style.display = 'none';
}

// ==================== COORDINATOR DASHBOARD ====================

function initializeCoordinatorDashboard() {
    loadCoordinatorEvents();
    updateCoordinatorStats();

    // Navigation between sections
    const navHome = document.getElementById('navHome');
    const navMyEvents = document.getElementById('navMyEvents');
    const navCreate = document.getElementById('navCreate');
    const navWishlist = document.getElementById('navWishlist');
    const navHistory = document.getElementById('navHistory');

    if (navHome) navHome.addEventListener('click', e => { e.preventDefault(); showCoordinatorSection('home'); });
    if (navMyEvents) navMyEvents.addEventListener('click', e => { e.preventDefault(); showCoordinatorSection('my-events'); });
    if (navCreate) navCreate.addEventListener('click', e => { e.preventDefault(); showCoordinatorSection('create'); });
    if (navWishlist) navWishlist.addEventListener('click', e => { e.preventDefault(); showCoordinatorSection('wishlist'); });
    if (navHistory) navHistory.addEventListener('click', e => { e.preventDefault(); showCoordinatorSection('history'); });

    // Event form listeners
    const eventForm = document.getElementById('eventForm');
    if (eventForm) {
        eventForm.addEventListener('submit', handleEventSubmit);
    }
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', saveDraftFromForm);
    }

    // Render coordinator home + wishlist/history
    renderCoordinatorHome();
    loadWishlistForCoordinator();
    loadHistoryForCoordinator();
    showCoordinatorSection('home');
}

function loadCoordinatorEvents() {
    const clubName = getCoordinatorClubName();
    const myEvents = events.filter(event => event.clubName === clubName);
    displayCoordinatorEvents(myEvents);
    updateCoordinatorStats();
}

function updateCoordinatorStats() {
    const clubName = getCoordinatorClubName();
    const myEvents = events.filter(event => event.clubName === clubName);
    const pending = myEvents.filter(event => event.status === 'pending').length;
    const approved = myEvents.filter(event => event.status === 'approved').length;
    const denied = myEvents.filter(event => event.status === 'denied').length;
    
    const totalMyEventsElement = document.getElementById('totalMyEvents');
    const pendingEventsElement = document.getElementById('pendingEvents');
    const approvedEventsElement = document.getElementById('approvedEvents');
    const deniedEventsElement = document.getElementById('deniedEvents');
    
    if (totalMyEventsElement) totalMyEventsElement.textContent = myEvents.length;
    if (pendingEventsElement) pendingEventsElement.textContent = pending;
    if (approvedEventsElement) approvedEventsElement.textContent = approved;
    if (deniedEventsElement) deniedEventsElement.textContent = denied;
}

function filterMyEvents(status) {
    const clubName = getCoordinatorClubName();
    const myEvents = events.filter(event => event.clubName === clubName);
    let filteredEvents = myEvents;
    
    if (status !== 'all') {
        filteredEvents = myEvents.filter(event => event.status === status);
    }
    
    displayCoordinatorEvents(filteredEvents);
    
    // Update active tab
    document.querySelectorAll('#myEventsFilterTabs .filter-tab').forEach(tab => tab.classList.remove('active'));
    // Assuming 'this' refers to the clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

function displayCoordinatorEvents(events) {
    const container = document.getElementById('myEventsContainer');
    const noEvents = document.getElementById('noMyEvents');
    
    if (events.length === 0) {
        if (container) container.style.display = 'none';
        if (noEvents) noEvents.style.display = 'block';
        return;
    }
    
    if (container) container.style.display = 'grid';
    if (noEvents) noEvents.style.display = 'none';
    
    if (container) {
        container.innerHTML = events.map(event => `
            <div class="event-card">
                <img src="${event.bannerUrl || 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}" alt="${event.title}">
                <div class="event-card-content">
                    <h3>${event.title}</h3>
                    <p><strong>Club:</strong> ${event.clubName}</p>
                    <p>${event.description.substring(0, 100)}...</p>
                    <div class="event-meta">
                        <span class="event-date">${formatDate(event.date)}</span>
                        <span class="event-status ${event.status}">${event.status}</span>
                    </div>
                    ${event.rejectionReason ? `<p class="rejection-reason"><strong>Rejection Reason:</strong> ${event.rejectionReason}</p>` : ''}
                    <div class="event-actions">
                        <button onclick="editEvent(${event.id})" class="btn-secondary">Edit</button>
                        <button onclick="deleteEvent(${event.id})" class="btn-danger">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

function openCreateEventModal() {
    document.getElementById('eventFormTitle').textContent = 'Create New Event';
    document.getElementById('submitBtnText').textContent = 'Submit for Approval';
    document.getElementById('eventForm').reset();
    document.getElementById('eventForm').removeAttribute('data-event-id');
    // Auto-fill club name for coordinator
    const clubInput = document.getElementById('eventClubName');
    if (clubInput) {
        clubInput.value = getCoordinatorClubName();
        clubInput.readOnly = true;
    }
    document.getElementById('eventFormModal').style.display = 'block';
}

function closeEventFormModal() {
    document.getElementById('eventFormModal').style.display = 'none';
}

function handleEventSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const eventId = event.target.dataset.eventId;
    
    const eventData = {
        id: eventId ? parseInt(eventId) : Date.now(),
        title: formData.get('title'),
        category: formData.get('category'),
        date: formData.get('date'),
        time: formData.get('time'),
        location: formData.get('location'),
        description: formData.get('description'),
        bannerUrl: formData.get('bannerUrl'),
        formLink: formData.get('formLink'),
        clubName: formData.get('clubName'),
        coordinator: currentUser.email,
        status: eventId ? (events.find(e => e.id === parseInt(eventId))?.status === 'draft' ? 'pending' : (events.find(e => e.id === parseInt(eventId))?.status || 'pending')) : 'pending',
        createdAt: eventId ? events.find(e => e.id === parseInt(eventId))?.createdAt : new Date().toISOString(),
        rejectionReason: eventId ? events.find(e => e.id === parseInt(eventId))?.rejectionReason : null
    };
    
    const isNewEvent = !eventId;
    
    if (eventId) {
        // Update existing event
        const index = events.findIndex(e => e.id === parseInt(eventId));
        if (index !== -1) {
            events[index] = eventData;
        }
    } else {
        // Create new event
        events.push(eventData);
    }
    
    saveEvents();
    closeEventFormModal();
    loadCoordinatorEvents();
    renderCoordinatorHome();
    
    showNotification(eventId ? 'Event updated successfully!' : 'Event created successfully! Waiting for faculty approval.', 'success');
    
    // Navigate to faculty dashboard for new event approval
    if (isNewEvent) {
        setTimeout(() => {
            window.location.href = 'faculty-dashboard.html';
        }, 1500);
    }
}

function editEvent(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    
    document.getElementById('eventFormTitle').textContent = 'Edit Event';
    document.getElementById('submitBtnText').textContent = 'Update Event';
    
    // Populate form
    document.getElementById('eventTitle').value = event.title;
    document.getElementById('eventCategory').value = event.category;
    document.getElementById('eventDate').value = event.date;
    document.getElementById('eventTime').value = event.time;
    document.getElementById('eventLocation').value = event.location;
    document.getElementById('eventDescription').value = event.description;
    document.getElementById('eventBanner').value = event.bannerUrl || '';
    document.getElementById('eventFormLink').value = event.formLink;
    document.getElementById('eventClubName').value = event.clubName;
    
    // Store event ID for update
    document.getElementById('eventForm').dataset.eventId = eventId;
    
    document.getElementById('eventFormModal').style.display = 'block';
}

function deleteEvent(eventId) {
    document.getElementById('deleteModal').style.display = 'block';
    document.getElementById('deleteModal').dataset.eventId = eventId;
}

function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
}

function confirmDeleteEvent() {
    const eventId = parseInt(document.getElementById('deleteModal').dataset.eventId);
    events = events.filter(event => event.id !== eventId);
    saveEvents();
    
    closeDeleteModal();
    loadCoordinatorEvents();
    showNotification('Event deleted successfully!', 'success');
}

// ===== Coordinator Home (Explore) =====
function showCoordinatorSection(sectionId) {
    const sections = ['home', 'my-events', 'create', 'wishlist', 'history'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === sectionId) ? 'block' : 'none';
    });

    // Highlight nav
    const navIds = {
        'home': 'navHome',
        'my-events': 'navMyEvents',
        'create': 'navCreate',
        'wishlist': 'navWishlist',
        'history': 'navHistory'
    };
    Object.values(navIds).forEach(nid => {
        const link = document.getElementById(nid);
        if (link) link.classList.remove('active');
    });
    const activeLink = document.getElementById(navIds[sectionId]);
    if (activeLink) activeLink.classList.add('active');

    if (sectionId === 'wishlist') loadWishlistForCoordinator();
    if (sectionId === 'history') loadHistoryForCoordinator();
    if (sectionId === 'home') renderCoordinatorHome();
}

function setCoordinatorHomeStatus(status) {
    coordinatorHomeStatus = status;
    // update active tab visuals
    const buttons = document.querySelectorAll('#statusTabs .filter-tab');
    buttons.forEach(btn => btn.classList.remove('active'));
    // Assuming 'this' refers to the clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    }
    renderCoordinatorHome();
}

function setCoordinatorHomeCategory(category) {
    coordinatorHomeCategory = category;
    const buttons = document.querySelectorAll('#categoryTabs .filter-tab');
    buttons.forEach(btn => btn.classList.remove('active'));
    // Assuming 'this' refers to the clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    }
    renderCoordinatorHome();
}

function renderCoordinatorHome() {
    const container = document.getElementById('coordinatorHomeContainer');
    const noEvents = document.getElementById('noHomeEvents');
    if (!container) return;

    const today = new Date();
    let visibleEvents = events.filter(e => e.status === 'approved');

    visibleEvents = visibleEvents.filter(e => {
        const d = new Date(e.date);
        switch (coordinatorHomeStatus) {
            case 'upcoming':
                return d > today;
            case 'ongoing':
                return d.toDateString() === today.toDateString();
            case 'completed':
                return d < today;
            case 'active':
            default:
                return d >= new Date(today.toDateString());
        }
    });

    if (coordinatorHomeCategory) {
        visibleEvents = visibleEvents.filter(e => e.category === coordinatorHomeCategory);
    }

    if (visibleEvents.length === 0) {
        container.style.display = 'none';
        if (noEvents) noEvents.style.display = 'block';
        return;
    }

    container.style.display = 'grid';
    if (noEvents) noEvents.style.display = 'none';
    // Reuse student card renderer to include wishlist hearts
    renderEvents(visibleEvents, 'coordinatorHomeContainer', true);
}

// ===== Drafts =====
function saveDraftFromForm() {
    const form = document.getElementById('eventForm');
    if (!form) return;
    const formData = new FormData(form);
    const eventId = form.dataset.eventId;

    const eventData = {
        id: eventId ? parseInt(eventId) : Date.now(),
        title: formData.get('title'),
        category: formData.get('category'),
        date: formData.get('date'),
        time: formData.get('time'),
        location: formData.get('location'),
        description: formData.get('description'),
        bannerUrl: formData.get('bannerUrl'),
        formLink: formData.get('formLink'),
        clubName: formData.get('clubName'),
        coordinator: currentUser.email,
        status: 'draft',
        createdAt: eventId ? (events.find(e => e.id === parseInt(eventId))?.createdAt || new Date().toISOString()) : new Date().toISOString(),
        rejectionReason: null
    };

    const index = events.findIndex(e => e.id === eventData.id);
    if (index !== -1) {
        events[index] = eventData;
    } else {
        events.push(eventData);
    }
    saveEvents();
    closeEventFormModal();
    loadCoordinatorEvents();
    showNotification('Draft saved locally. You can submit it later for approval.', 'success');
}

function getCoordinatorClubName() {
    // Basic mapping; extend as needed
    if (!currentUser) return '';
    const map = {
        'coordinator@college.edu': 'Tech Club'
    };
    return map[currentUser.email] || 'Tech Club';
}

// ===== Wishlist & History for Coordinator =====
function loadWishlistForCoordinator() {
    const container = document.getElementById('wishlistContainer');
    const noWishlist = document.getElementById('noWishlist');
    if (!container) return;

    const wishIds = wishlist.filter(w => w.userEmail === currentUser.email).map(w => w.eventId);
    const items = events.filter(e => wishIds.includes(e.id) && e.status === 'approved');

    if (items.length === 0) {
        container.style.display = 'none';
        if (noWishlist) noWishlist.style.display = 'block';
        return;
    }
    container.style.display = 'grid';
    if (noWishlist) noWishlist.style.display = 'none';
    renderEvents(items, 'wishlistContainer', true);
}

function loadHistoryForCoordinator() {
    const container = document.getElementById('historyContainer');
    const noHistory = document.getElementById('noHistory');
    if (!container) return;

    console.debug('loadHistoryForCoordinator: registeredEventIds=', Array.from(registeredEventIds));
    console.debug('loadHistoryForCoordinator: registrations=', registrations);
    console.debug('loadHistoryForCoordinator: events count=', events.length);

    // Use authoritative server-backed Set `registeredEventIds` so we show
    // all events the current user registered for (including upcoming).
    const items = events
        .filter(e => registeredEventIds.has(Number(e.id)))
        .map(e => {
            const reg = registrations.find(r => Number(r.eventId) === Number(e.id));
            return { ...e, _registeredAt: reg ? reg.registeredAt : null };
        });

    console.debug('loadHistoryForCoordinator: items to render count=', items.length, items);

    if (items.length === 0) {
        container.style.display = 'none';
        if (noHistory) noHistory.style.display = 'block';
        return;
    }
    container.style.display = 'grid';
    if (noHistory) noHistory.style.display = 'none';

    container.innerHTML = items.map(event => `
        <div class="event-card" onclick="openEventModal(${event.id})">
            <img src="${event.bannerUrl || 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}" alt="${event.title}">
            <div class="event-card-content">
                <div class="event-header">
                    <h3>${event.title}</h3>
                </div>
                <p><strong>Club:</strong> ${event.clubName}</p>
                <p>${event.description.substring(0, 100)}...</p>
                <div class="event-meta">
                    <span class="event-date">Participated: ${new Date(event._registeredAt).toLocaleDateString()}</span>
                    <span class="event-category">${event.category}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// ==================== FACULTY DASHBOARD ====================

function initializeFacultyDashboard() {
    loadFacultyRequests();
    updateFacultyStats();
    
    // Add event listeners
    const searchInput = document.getElementById('searchRequests');
    if (searchInput) {
        searchInput.addEventListener('input', searchRequests);
    }

    // Poll backend regularly so faculty dashboard sees new submissions from other tabs/users
    if (!window._campusconnect_faculty_poll) {
        window._campusconnect_faculty_poll = setInterval(() => {
            loadDataFromBackend().then(ok => {
                if (ok) {
                    loadFacultyRequests();
                    updateFacultyStats();
                }
            }).catch(() => {});
        }, 5000);
    }
}

// Global variable to store pending events for faculty dashboard
let pendingEventsData = [];

async function loadFacultyRequests() {
    try {
        const response = await fetch('/api/events/pending');
        if (response.ok) {
            pendingEventsData = await response.json();
            displayFacultyRequests(pendingEventsData);
            updateFacultyStats(pendingEventsData);
        } else {
            console.error('Failed to load pending events');
            pendingEventsData = [];
            displayFacultyRequests([]);
            updateFacultyStats([]);
        }
    } catch (error) {
        console.error('Error loading faculty requests:', error);
        pendingEventsData = [];
        displayFacultyRequests([]);
        updateFacultyStats([]);
    }
}

function updateFacultyStats(pendingEvents = []) {
    const pending = pendingEvents.length;
    const approved = events.filter(event => event.status === 'approved').length;
    const denied = events.filter(event => event.status === 'denied').length;
    
    const pendingRequestsElement = document.getElementById('pendingRequests');
    const approvedRequestsElement = document.getElementById('approvedRequests');
    const deniedRequestsElement = document.getElementById('deniedRequests');
    
    if (pendingRequestsElement) pendingRequestsElement.textContent = pending;
    if (approvedRequestsElement) approvedRequestsElement.textContent = approved;
    if (deniedRequestsElement) deniedRequestsElement.textContent = denied;
}

function filterRequests(status) {
    let filteredEvents = events;
    
    if (status !== 'all') {
        filteredEvents = events.filter(event => event.status === status);
    }
    
    displayFacultyRequests(filteredEvents);
    updateSectionTitle(status);
    
    // Update active tab
    document.querySelectorAll('#facultyFilterTabs .filter-tab').forEach(tab => tab.classList.remove('active'));
    // Assuming 'this' refers to the clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

function updateSectionTitle(status) {
    const titles = {
        'pending': 'Pending Requests',
        'approved': 'Approved Events',
        'denied': 'Denied Events',
        'all': 'All Events'
    };
    const sectionTitleElement = document.getElementById('sectionTitle');
    if (sectionTitleElement) {
        sectionTitleElement.textContent = titles[status] || 'Events';
    }
}

function searchRequests() {
    const searchTerm = document.getElementById('searchRequests').value.toLowerCase();
    const filteredEvents = events.filter(event => 
        event.title.toLowerCase().includes(searchTerm) ||
        event.description.toLowerCase().includes(searchTerm) ||
        event.coordinator.toLowerCase().includes(searchTerm) ||
        event.clubName.toLowerCase().includes(searchTerm)
    );
    
    displayFacultyRequests(filteredEvents);
}

function displayFacultyRequests(pendingEvents) {
    const container = document.getElementById('requestsContainer');
    const noRequests = document.getElementById('noRequests');
    
    if (pendingEvents.length === 0) {
        if (container) container.style.display = 'none';
        if (noRequests) noRequests.style.display = 'block';
        const noRequestsMessageElement = document.getElementById('noRequestsMessage');
        if (noRequestsMessageElement) {
            noRequestsMessageElement.textContent = 'No pending events to review.';
        }
        return;
    }
    
    if (container) container.style.display = 'grid';
    if (noRequests) noRequests.style.display = 'none';
    
    if (container) {
        container.innerHTML = pendingEvents.map(event => `
            <div class="request-card">
                <div class="request-card-header">
                    <h3>${event.title}</h3>
                    <span class="event-status ${event.status}">${event.status}</span>
                </div>
                <div class="request-card-content">
                    <p><strong>Club:</strong> ${event.clubName}</p>
                    <p><strong>Category:</strong> ${event.category}</p>
                    <p><strong>Date:</strong> ${formatDate(event.date)} at ${event.time}</p>
                    <p><strong>Location:</strong> ${event.location}</p>
                    <p><strong>Coordinator:</strong> ${event.createdBy}</p>
                    <p>${event.description.substring(0, 150)}...</p>
                </div>
                <div class="request-card-actions">
                    <button onclick="viewRequestDetails(${event.id})" class="btn-secondary">View Details</button>
                    ${event.status === 'pending' ? `
                        <button onclick="approveEvent(${event.id})" class="btn-success">Approve</button>
                        <button onclick="denyEvent(${event.id})" class="btn-danger">Deny</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }
}

function viewRequestDetails(eventId) {
    const event = pendingEventsData.find(e => e.id === eventId);
    if (!event) return;
    
    const modal = document.getElementById('requestModal');
    const content = document.getElementById('requestModalContent');
    const actions = document.getElementById('requestModalActions');
    
    content.innerHTML = `
        <div class="request-details">
            <img src="${event.bannerUrl || 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}" alt="${event.title}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 10px; margin-bottom: 20px;">
            <h3>${event.title}</h3>
            <div class="event-details">
                <p><strong>Club:</strong> ${event.clubName}</p>
                <p><strong>Category:</strong> ${event.category}</p>
                <p><strong>Date:</strong> ${formatDate(event.date)} at ${event.time}</p>
                <p><strong>Location:</strong> ${event.location}</p>
                <p><strong>Coordinator:</strong> ${event.coordinator}</p>
                <p><strong>Status:</strong> <span class="event-status ${event.status}">${event.status}</span></p>
                <p><strong>Description:</strong> ${event.description}</p>
                <p><strong>Registration Form:</strong> <a href="${event.formLink}" target="_blank">${event.formLink}</a></p>
                ${event.rejectionReason ? `<p><strong>Rejection Reason:</strong> ${event.rejectionReason}</p>` : ''}
            </div>
        </div>
    `;
    
    if (event.status === 'pending') {
        actions.innerHTML = `
            <button onclick="approveEvent(${event.id})" class="btn-success">Approve Event</button>
            <button onclick="denyEvent(${event.id})" class="btn-danger">Deny Event</button>
        `;
    } else if (event.status === 'approved') {
        actions.innerHTML = `
            <button onclick="cancelEvent(${event.id})" class="btn-danger">Cancel Event</button>
        `;
    } else {
        actions.innerHTML = '';
    }
    
    modal.style.display = 'block';
}

function closeRequestModal() {
    document.getElementById('requestModal').style.display = 'none';
}

function approveEvent(eventId) {
    if (confirm('Are you sure you want to approve this event?')) {
        fetch(`/api/events/${eventId}/approve`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Event approved successfully!', 'success');
                loadFacultyRequests(); // Refresh the pending events list
                closeRequestModal();
            } else {
                showNotification('Failed to approve event: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error approving event:', error);
            showNotification('Error approving event', 'error');
        });
    }
}

function denyEvent(eventId) {
    const rejectionReason = prompt('Please provide a reason for rejection:');
    if (rejectionReason === null) return; // User cancelled
    
    if (rejectionReason.trim() === '') {
        showNotification('Please provide a rejection reason', 'error');
        return;
    }
    
    fetch(`/api/events/${eventId}/deny`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            status: 'denied',
            rejection_reason: rejectionReason
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Event denied successfully!', 'success');
            loadFacultyRequests(); // Refresh the pending events list
            closeRequestModal();
        } else {
            showNotification('Failed to deny event: ' + data.error, 'error');
        }
    })
    .catch(error => {
        console.error('Error denying event:', error);
        showNotification('Error denying event', 'error');
    });
}

function cancelEvent(eventId) {
    if (!confirm('Are you sure you want to cancel this approved event?')) return;
    
    const eventIndex = events.findIndex(e => e.id === eventId);
    if (eventIndex !== -1) {
        events[eventIndex].status = 'cancelled';
        saveEvents();
        loadFacultyRequests();
        showNotification('Event cancelled successfully!', 'success');
        closeRequestModal();
    }
}

// ==================== UTILITY FUNCTIONS ====================

function loadPublicEvents() {
    const approvedEvents = events.filter(event => event.status === 'approved').slice(0, 3);
    renderEvents(approvedEvents, 'publicEventsGrid', false);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function saveEvents() {
    // Persist to PostgreSQL database
    try {
        scheduleSaveToBackend();
    } catch (err) {
        console.error('Error saving events to database', err);
    }
}

function saveWishlist() {
    try {
        scheduleSaveToBackend();
    } catch (err) {
        console.error('Error saving wishlist to database', err);
    }
}

function saveRegistrations() {
    try {
        scheduleSaveToBackend();
    } catch (err) {
        console.error('Error saving registrations to database', err);
    }
}

function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 3000;
        animation: slideInRight 0.3s ease;
        ${type === 'success' ? 'background: #10b981;' : 'background: #ef4444;'}
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ==================== EVENT LISTENERS ====================

function initializeEventListeners() {
    // Hamburger menu toggle
    const hamburger = document.getElementById('hamburger');
    if (hamburger) {
        hamburger.addEventListener('click', toggleHamburger);
    }
    
    // Close hamburger when clicking on nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', closeHamburger);
    });

    // Keep active nav item highlighted on public home page sections
    initializePublicNavActiveState();
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        const modals = [
            'eventModal', 'eventFormModal', 'eventDetailsModal', 
            'requestModal', 'decisionModal', 'bulkModal', 
            'deleteModal', 'registrationModal'
        ];
        
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', function(event) {
        if (event.key === 'ArrowLeft') {
            prevSlide();
        } else if (event.key === 'ArrowRight') {
            nextSlide();
        } else if (event.key === 'Escape') {
            // Close all modals
            document.querySelectorAll('[id$="Modal"]').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
}

function initializePublicNavActiveState() {
    const navLinks = Array.from(document.querySelectorAll('.nav-menu .nav-link[href^="#"]'));
    if (navLinks.length === 0) return;

    const sections = navLinks
        .map(link => {
            const hash = link.getAttribute('href');
            const section = hash ? document.querySelector(hash) : null;
            return section;
        })
        .filter(Boolean);

    if (sections.length === 0) return;

    const setActiveLink = (hash) => {
        navLinks.forEach(link => {
            const isActive = link.getAttribute('href') === hash;
            link.classList.toggle('active', isActive);
        });
    };

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const hash = link.getAttribute('href');
            if (hash) setActiveLink(hash);
        });
    });

    const updateActiveOnScroll = () => {
        const offset = 100;
        let activeHash = navLinks[0].getAttribute('href');

        sections.forEach(section => {
            if ((window.scrollY + offset) >= section.offsetTop) {
                activeHash = `#${section.id}`;
            }
        });

        if (activeHash) setActiveLink(activeHash);
    };

    window.addEventListener('scroll', updateActiveOnScroll, { passive: true });
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash || navLinks[0].getAttribute('href');
        if (hash) setActiveLink(hash);
    });

    const initialHash = window.location.hash || navLinks[0].getAttribute('href');
    if (initialHash) setActiveLink(initialHash);
    updateActiveOnScroll();
}

function toggleHamburger() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    }
}

function closeHamburger() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    }
}

// ==================== ADDITIONAL STUDENT FUNCTIONS ====================

function filterEventsByStatus(status) {
    const today = new Date();
    let filteredEvents = events.filter(event => event.status === 'approved');
    
    switch(status) {
        case 'upcoming':
            filteredEvents = filteredEvents.filter(event => new Date(event.date) > today);
            break;
        case 'ongoing':
            filteredEvents = filteredEvents.filter(event => new Date(event.date).toDateString() === today.toDateString());
            break;
        case 'completed':
            filteredEvents = filteredEvents.filter(event => new Date(event.date) < today);
            break;
    }
    
    const sectionTitleElement = document.getElementById('sectionTitle');
    if (sectionTitleElement) {
        sectionTitleElement.textContent = status.charAt(0).toUpperCase() + status.slice(1) + ' Events';
    }
    renderEvents(filteredEvents, 'eventsContainer', true);
    
    // Update active tab
    document.querySelectorAll('#studentFilterTabs .filter-tab').forEach(tab => tab.classList.remove('active'));
    // Assuming 'this' refers to the clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

function showWishlistedEvents() {
    const wishlistedEventIds = wishlist
        .filter(item => item.userEmail === currentUser.email)
        .map(item => item.eventId);
    
    const wishlistedEvents = events.filter(event => 
        wishlistedEventIds.includes(event.id) && event.status === 'approved'
    );
    
    const sectionTitleElement = document.getElementById('sectionTitle');
    const noEventsMessageElement = document.getElementById('noEventsMessage');
    
    if (sectionTitleElement) sectionTitleElement.textContent = 'Wishlisted Events';
    if (noEventsMessageElement) noEventsMessageElement.textContent = 'You haven\'t added any events to your wishlist yet.';
    renderEvents(wishlistedEvents, 'eventsContainer', true);
    
    // Update active tab
    document.querySelectorAll('#studentFilterTabs .filter-tab').forEach(tab => tab.classList.remove('active'));
    // Assuming 'this' refers to the clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

function showRegisteredEvents() {
    const registeredEventIds = registrations
        .filter(reg => reg.userEmail === currentUser.email)
        .map(reg => reg.eventId);
    
    const registeredEvents = events.filter(event => 
        registeredEventIds.includes(event.id) && event.status === 'approved'
    );
    
    const sectionTitleElement = document.getElementById('sectionTitle');
    const noEventsMessageElement = document.getElementById('noEventsMessage');
    
    if (sectionTitleElement) sectionTitleElement.textContent = 'Registered Events';
    if (noEventsMessageElement) noEventsMessageElement.textContent = 'You haven\'t registered for any events yet.';
    renderEvents(registeredEvents, 'eventsContainer', true);
    
    // Update active tab
    document.querySelectorAll('#studentFilterTabs .filter-tab').forEach(tab => tab.classList.remove('active'));
    // Assuming 'this' refers to the clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

function showEventHistory() {
    // Use the authoritative server-backed Set `registeredEventIds` to find events
    const participatedEvents = events.filter(event => registeredEventIds.has(Number(event.id)));
    
    const sectionTitleElement = document.getElementById('sectionTitle');
    const noEventsMessageElement = document.getElementById('noEventsMessage');
    
    if (sectionTitleElement) sectionTitleElement.textContent = 'Event History';
    if (noEventsMessageElement) noEventsMessageElement.textContent = 'You haven\'t participated in any events yet.';
    renderEvents(participatedEvents, 'eventsContainer', true);
    
    // Update active tab
    document.querySelectorAll('#studentFilterTabs .filter-tab').forEach(tab => tab.classList.remove('active'));
    // Assuming 'this' refers to the clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

// ==================== FACULTY FUNCTIONS ====================

function closeRejectionModal() {
    document.getElementById('rejectionModal').style.display = 'none';
    document.getElementById('rejectionReason').value = '';
}

function confirmRejection() {
    const rejectionReason = document.getElementById('rejectionReason').value.trim();
    if (!rejectionReason) {
        showNotification('Please provide a rejection reason', 'error');
        return;
    }
    
    const eventId = parseInt(document.getElementById('rejectionModal').dataset.eventId);
    const eventIndex = events.findIndex(e => e.id === eventId);
    
    if (eventIndex !== -1) {
        events[eventIndex].status = 'denied';
        events[eventIndex].rejectionReason = rejectionReason;
        saveEvents();
        loadFacultyRequests();
        showNotification('Event denied successfully!', 'success');
        closeRejectionModal();
    }
}


function cancelEvent(eventId) {
    if (!confirm('Are you sure you want to cancel this approved event?')) return;
    
    const eventIndex = events.findIndex(e => e.id === eventId);
    if (eventIndex !== -1) {
        events[eventIndex].status = 'cancelled';
        saveEvents();
        loadFacultyRequests();
        showNotification('Event cancelled successfully!', 'success');
        closeRequestModal();
    }
}
