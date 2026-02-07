const API_URL = "http://127.0.0.1:5000/api";
let jobs = []; // Will hold data from Google Sheet

// --- 1. Fetch Real Data from Backend ---
async function loadJobs() {
    try {
        const response = await fetch(`${API_URL}/jobs`);
        if (!response.ok) throw new Error("Failed to fetch jobs");
        
        jobs = await response.json(); // Save real data to variable
        
        // Refresh the UI with the new data
        const homeContainer = document.getElementById('jobs-container');
        if (homeContainer) renderHomeJobs(jobs);

        const allContainer = document.getElementById('all-jobs-container');
        if (allContainer) renderAllJobs(jobs);

        const countSpan = document.getElementById('job-count');
        if(countSpan) countSpan.textContent = `Showing ${jobs.length} Jobs`;

    } catch (error) {
        console.error("Error loading jobs:", error);
        // Optional: Show error message on screen
    }
}

// Call this immediately to start loading data
loadJobs();


// --- 2. Shared Modal Logic ---
const modal = document.getElementById('apply-modal');
const closeModalBtn = document.querySelector('.close-modal');
const modalTitle = document.getElementById('modal-job-title');
const applyForm = document.querySelector('.apply-form');

function openModal(jobTitle) {
    if (modal) {
        modalTitle.textContent = `Apply for ${jobTitle}`;
        modal.classList.add('open');
    }
}

if (closeModalBtn) closeModalBtn.addEventListener('click', () => modal.classList.remove('open'));
if (modal) window.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
if (applyForm) {
    applyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Application Submitted Successfully!');
        modal.classList.remove('open');
    });
}


// --- 3. Home Page Render Logic ---
const homeJobsContainer = document.getElementById('jobs-container');

function renderHomeJobs(data) {
    if (!homeJobsContainer) return;
    homeJobsContainer.innerHTML = "";
    
    // Show first 6 jobs
    data.slice(0, 6).forEach(job => {
        const jobCard = document.createElement('div');
        jobCard.classList.add('job-card');
        jobCard.innerHTML = `
            <div class="job-header">
                <div class="company-logo">${job.logo}</div>
                <span class="job-type">${job.type || 'Full Time'}</span>
            </div>
            <h3 class="job-title">${job.title}</h3>
            <p class="company-name">${job.company}</p>
            <div class="job-details">
                <span><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
                <span><i class="fas fa-money-bill-wave"></i> ${job.salary}</span>
            </div>
            <button class="apply-btn" onclick="openModal('${job.title}')">Apply Now</button>
        `;
        homeJobsContainer.appendChild(jobCard);
    });
}

// Global Filter for Home
window.filterHomeJobs = function() {
    const keyword = document.getElementById('job-search').value.toLowerCase();
    const location = document.getElementById('location-search').value.toLowerCase();
    
    const filtered = jobs.filter(job => {
        const t = (job.title || "").toLowerCase();
        const c = (job.company || "").toLowerCase();
        const l = (job.location || "").toLowerCase();
        
        return (t.includes(keyword) || c.includes(keyword)) && l.includes(location);
    });
    renderHomeJobs(filtered);
}


// --- 4. Jobs Page Render Logic ---
const allJobsContainer = document.getElementById('all-jobs-container');

function renderAllJobs(data) {
    if (!allJobsContainer) return;
    allJobsContainer.innerHTML = "";
    
    if (data.length === 0) {
        allJobsContainer.innerHTML = "<div style='text-align:center; padding:2rem; width:100%; color:#666;'>No jobs found.</div>";
        return;
    }

    data.forEach(job => {
        const card = document.createElement('div');
        card.classList.add('job-card-wide');
        card.innerHTML = `
            <div class="logo-box">${job.logo}</div>
            <div class="job-info">
                <h3>${job.title}</h3>
                <div class="company">${job.company}</div>
                <div class="meta">
                    <span><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
                    <span><i class="fas fa-money-bill-wave"></i> ${job.salary}</span>
                    <span><i class="fas fa-briefcase"></i> ${job.type || 'Full Time'}</span>
                </div>
            </div>
            <div class="actions">
                <span class="tag">Active</span>
                <button class="btn-primary" onclick="openModal('${job.title}')">Apply</button>
            </div>
        `;
        allJobsContainer.appendChild(card);
    });
}

window.applyFilters = function() {
    const keyword = document.getElementById('keyword-filter').value.toLowerCase();
    const location = document.getElementById('location-filter').value.toLowerCase();
    const checkedTypes = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);

    const filtered = jobs.filter(job => {
        const t = (job.title || "").toLowerCase();
        const c = (job.company || "").toLowerCase();
        const l = (job.location || "").toLowerCase();
        const type = (job.type || "");

        const matchKeyword = t.includes(keyword) || c.includes(keyword);
        const matchLocation = l.includes(location);
        const matchType = checkedTypes.length === 0 || checkedTypes.includes(type);

        return matchKeyword && matchLocation && matchType;
    });
    renderAllJobs(filtered);
}


// --- 5. "Remember Me" & Auth Logic ---
// This runs AUTOMATICALLY every time any page loads
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Check if user is saved in browser memory
    const userStr = localStorage.getItem('user');
    const authButtons = document.querySelector('.auth-buttons');
    const userProfile = document.querySelector('.user-profile'); // For Dashboard sidebar

    if (userStr) {
        // --- USER IS LOGGED IN ---
        const user = JSON.parse(userStr);
        const firstName = user.name.split(' ')[0];

        // A. Update Top Navbar
        if (authButtons) {
            authButtons.innerHTML = `
                <a href="dashboard.html" class="btn-text" style="display:flex; align-items:center; gap:8px; text-decoration:none;">
                    <i class="fas fa-user-circle"></i> ${firstName}
                </a>
                <a onclick="globalLogout()" class="btn-primary" style="cursor:pointer;">Logout</a>
            `;
        }

        // B. Update Dashboard Sidebar (if on dashboard page)
        if (userProfile) {
            const nameEl = document.getElementById('user-name');
            const headerName = document.getElementById('header-name');
            const avatar = document.getElementById('user-avatar');

            if(nameEl) nameEl.textContent = user.name;
            if(headerName) headerName.textContent = firstName;
            if(avatar) avatar.textContent = firstName.charAt(0).toUpperCase();
        }

    } else {
        // --- USER IS NOT LOGGED IN ---
        
        // If they try to access Dashboard without login, kick them out
        if (window.location.pathname.includes('dashboard.html')) {
            window.location.href = 'login.html';
        }

        // Reset Navbar to show Login buttons
        if (authButtons) {
            authButtons.innerHTML = `
                <a href="login.html" class="btn-text">Log In</a>
                <a href="login.html" class="btn-primary">Sign Up</a>
            `;
        }
    }
});

// Logout function
window.globalLogout = function() {
    localStorage.removeItem('user'); // Delete memory
    window.location.href = 'index.html'; // Go home
}