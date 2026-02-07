const API_URL = "http://127.0.0.1:5000/api";
let jobs = []; 

// 1. Fetch Real Data
async function loadJobs() {
    try {
        const response = await fetch(`${API_URL}/jobs`);
        if (!response.ok) throw new Error("Failed to fetch jobs");
        
        jobs = await response.json(); 
        
        // Render
        const homeContainer = document.getElementById('jobs-container');
        if (homeContainer) renderHomeJobs(jobs);

        const allContainer = document.getElementById('all-jobs-container');
        if (allContainer) renderAllJobs(jobs);

        const countSpan = document.getElementById('job-count');
        if(countSpan) countSpan.textContent = `Showing ${jobs.length} Jobs`;

    } catch (error) {
        console.error("Error loading jobs:", error);
    }
}
loadJobs();

// 2. Render Functions (Updated onclick)
const homeJobsContainer = document.getElementById('jobs-container');

function renderHomeJobs(data) {
    if (!homeJobsContainer) return;
    homeJobsContainer.innerHTML = "";
    
    data.slice(0, 6).forEach(job => {
        const jobCard = document.createElement('div');
        jobCard.classList.add('job-card');
        jobCard.innerHTML = `
            <div class="job-header">
                <div class="company-logo">${job.logo}</div>
                <span class="job-type">${job.type}</span>
            </div>
            <h3 class="job-title">${job.title}</h3>
            <p class="company-name">${job.company}</p>
            <div class="job-details">
                <span><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
                <span><i class="fas fa-money-bill-wave"></i> ${job.salary}</span>
            </div>
            <button class="apply-btn" onclick="openJobDetails(${job.id})">View Details</button>
        `;
        homeJobsContainer.appendChild(jobCard);
    });
}

const allJobsContainer = document.getElementById('all-jobs-container');

function renderAllJobs(data) {
    if (!allJobsContainer) return;
    allJobsContainer.innerHTML = "";

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
                    <span><i class="fas fa-clock"></i> ${job.hours}</span>
                </div>
            </div>
            <div class="actions">
                <button class="btn-primary" onclick="openJobDetails(${job.id})">View Details</button>
            </div>
        `;
        allJobsContainer.appendChild(card);
    });
}

// 3. New Modal Logic
function openJobDetails(jobId) {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    // Fill Modal Data
    document.getElementById('modal-title').textContent = job.title;
    document.getElementById('modal-company').textContent = job.company;
    document.getElementById('modal-salary').textContent = job.salary;
    document.getElementById('modal-location').textContent = job.location;
    document.getElementById('modal-hours').textContent = job.hours || "Not Specified";
    document.getElementById('modal-logo').textContent = job.logo;
    
    document.getElementById('modal-description').textContent = job.description;
    document.getElementById('modal-requirements').textContent = job.requirements;
    document.getElementById('modal-training').textContent = job.training || "None";

    // Show Modal
    document.getElementById('job-modal').classList.add('open');
}

function closeJobModal() {
    document.getElementById('job-modal').classList.remove('open');
}

function applyForJob() {
    alert("Application Started! (This is a demo)");
    closeJobModal();
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById('job-modal');
    if (e.target === modal) {
        closeJobModal();
    }
});

// 4. Auth Logic (Keep this)
document.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('user');
    const authButtons = document.querySelector('.auth-buttons');
    if (authButtons && userStr) {
        const user = JSON.parse(userStr);
        authButtons.innerHTML = `
            <a href="dashboard.html" class="btn-text"><i class="fas fa-user-circle"></i> ${user.name.split(' ')[0]}</a>
            <a onclick="globalLogout()" class="btn-primary" style="cursor:pointer;">Logout</a>
        `;
    }
});

window.globalLogout = function() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// 5. Search Filters (Keep this)
window.filterHomeJobs = function() {
    const keyword = document.getElementById('job-search').value.toLowerCase();
    const location = document.getElementById('location-search').value.toLowerCase();
    const filtered = jobs.filter(job => 
        (job.title.toLowerCase().includes(keyword) || job.company.toLowerCase().includes(keyword)) &&
        job.location.toLowerCase().includes(location)
    );
    renderHomeJobs(filtered);
}