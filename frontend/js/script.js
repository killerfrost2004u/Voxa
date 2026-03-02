const API_URL = "http://127.0.0.1:5000/api";
let jobs = []; 
let companies = []; 
let salaryStats = []; 

// --- PAGINATION VARIABLES (Global Scope) ---
let allJobs = [];
window.filteredJobs = []; // Make explicitly global so the filter function can write to it
window.currentPage = 1;   // Make explicitly global so changePage can edit it
const jobsPerPage = 10; 

// --- LOAD JOBS ---
async function loadJobs() {
    try {
        const res = await fetch('http://127.0.0.1:5000/api/jobs');
        allJobs = await res.json();
        
        // By default, filtered jobs is all jobs
        window.filteredJobs = [...allJobs];
        
        // Update the top job count text
        const countSpan = document.getElementById('job-count');
        if(countSpan) countSpan.innerText = `${window.filteredJobs.length} Jobs Found`;

        renderJobs();
    } catch (err) {
        console.error("Failed to load jobs:", err);
    }
}

// --- RENDER 10 JOBS PER PAGE (FIXED STYLING) ---
window.renderJobs = function() {
    const container = document.getElementById('all-jobs-container');
    if (!container) return; // Failsafe if we aren't on jobs.html

    // 1. Calculate which 10 jobs to show from the FILTERED list
    const startIndex = (window.currentPage - 1) * jobsPerPage;
    const endIndex = startIndex + jobsPerPage;
    const jobsToShow = window.filteredJobs.slice(startIndex, endIndex);

    // 2. Clear the container
    container.innerHTML = "";

    // 3. Let YOUR original styling function draw the cards!
    if(jobsToShow.length === 0) { 
        container.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#888;">No jobs found matching your criteria.</p>`; 
    } else {
        jobsToShow.forEach(job => appendJobCard(container, job, true));
    }

    // 4. Update the page buttons at the bottom
    renderPaginationControls();
}

// --- RENDER THE PAGE BUTTONS ---
window.renderPaginationControls = function() {
    const pageDiv = document.getElementById('pagination-controls');
    if (!pageDiv) return;

    // Calculate pages based on the FILTERED list
    const totalPages = Math.ceil(window.filteredJobs.length / jobsPerPage);
    
    if (totalPages <= 1) {
        pageDiv.innerHTML = '';
        return;
    }

    let buttonsHTML = '';

    // Prev Button
    if (window.currentPage > 1) {
        buttonsHTML += `<button class="page-btn" onclick="changePage(${window.currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
    } else {
        buttonsHTML += `<button class="page-btn disabled"><i class="fas fa-chevron-left"></i></button>`;
    }

    // Numbered Pages
    for (let i = 1; i <= totalPages; i++) {
        if (i === window.currentPage) {
            buttonsHTML += `<button class="page-btn active">${i}</button>`;
        } else {
            buttonsHTML += `<button class="page-btn" onclick="changePage(${i})">${i}</button>`;
        }
    }

    // Next Button
    if (window.currentPage < totalPages) {
        buttonsHTML += `<button class="page-btn" onclick="changePage(${window.currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
    } else {
        buttonsHTML += `<button class="page-btn disabled"><i class="fas fa-chevron-right"></i></button>`;
    }

    pageDiv.innerHTML = buttonsHTML;
}

// --- TRIGGER PAGE CHANGE ---
// This function MUST be global so HTML buttons can click it
window.changePage = function(pageNumber) {
    window.currentPage = pageNumber;
    window.renderJobs();
    
    // Smoothly scroll back to the top of the job feed
    const feedHeader = document.querySelector('.feed-header');
    if (feedHeader) {
        feedHeader.scrollIntoView({ behavior: 'smooth' });
    }
}

// Load jobs when the page opens
if (window.location.pathname.includes('jobs.html')) {
    document.addEventListener('DOMContentLoaded', loadJobs);
}

// --- DASHBOARD LOGIC ---

window.loadDashboardData = function() {
    const apps = JSON.parse(localStorage.getItem('my_applications')) || [];
    const saved = JSON.parse(localStorage.getItem('my_saved_jobs')) || [];

    if(document.getElementById('stat-applied')) document.getElementById('stat-applied').textContent = apps.length;
    if(document.getElementById('stat-saved')) document.getElementById('stat-saved').textContent = saved.length;

    const dashTable = document.querySelector('#dashboard-table tbody');
    if(dashTable) {
        dashTable.innerHTML = apps.length ? '' : '<tr><td colspan="4" style="text-align:center; color:#666;">No hunts started yet.</td></tr>';
        apps.slice(0, 5).forEach(app => {
            dashTable.innerHTML += `
                <tr>
                    <td style="color:white; font-weight:600;">${app.title}</td>
                    <td>${app.company}</td>
                    <td>${app.date}</td>
                    <td><span class="status-badge status-applied">Applied</span></td>
                </tr>
            `;
        });
    }

    const appTable = document.querySelector('#applications-table tbody');
    if(appTable) {
        appTable.innerHTML = apps.length ? '' : '<tr><td colspan="5" style="text-align:center;">No applications yet.</td></tr>';
        apps.forEach(app => {
            appTable.innerHTML += `
                <tr>
                    <td style="color:white; font-weight:600;">${app.title}</td>
                    <td>${app.company}</td>
                    <td>${app.date}</td>
                    <td><span class="status-badge status-applied">Applied</span></td>
                    <td><a href="#" style="color:var(--primary-color)">View</a></td>
                </tr>
            `;
        });
    }

    const savedContainer = document.getElementById('saved-jobs-container');
    if(savedContainer) {
        savedContainer.innerHTML = saved.length ? '' : '<p style="color:#666;">No saved jobs.</p>';
        saved.forEach(job => {
            const card = document.createElement('div');
            card.classList.add('job-card-wide');
            card.innerHTML = `
                <div class="logo-box">${job.logo || 'DW'}</div>
                <div class="job-info">
                    <h3>${job.title}</h3>
                    <div class="company">${job.company}</div>
                </div>
                <div class="actions">
                    <button class="btn-primary" onclick="openJobDetails(${job.id})">Apply</button>
                    <button class="btn-remove" onclick="removeSavedJob(${job.id})"><i class="fas fa-trash-alt"></i> Remove</button>
                </div>
            `;
            savedContainer.appendChild(card);
        });
    }
}

window.removeSavedJob = function(id) {
    let saved = JSON.parse(localStorage.getItem('my_saved_jobs')) || [];
    saved = saved.filter(j => j.id !== id);
    localStorage.setItem('my_saved_jobs', JSON.stringify(saved));
    loadDashboardData(); 
}

// --- APPLY FUNCTION ---
function applyForJob() {
    const title = document.getElementById('modal-title').textContent;
    const company = document.getElementById('modal-company').textContent;
    
    // CHANGED 'jobs' to 'allJobs' so it finds the ID from the database!
    const job = allJobs.find(j => j.title === title && j.company === company);
    const id = job ? job.id : 0;

    window.location.href = `apply.html?id=${id}&title=${encodeURIComponent(title)}&company=${encodeURIComponent(company)}`;
}

// --- HANDLE APPLICATION FORM ---
if (document.getElementById('application-form')) {
    document.getElementById('application-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const params = new URLSearchParams(window.location.search);
        const title = params.get('title') || 'Unknown Job';
        const company = params.get('company') || 'Unknown Company';
        
        const application = {
            title: title,
            company: company,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            status: 'Applied'
        };

        const apps = JSON.parse(localStorage.getItem('my_applications')) || [];
        if (!apps.some(app => app.title === title && app.company === company)) {
            apps.unshift(application);
            localStorage.setItem('my_applications', JSON.stringify(apps));
        }

        alert("Application Submitted Successfully!");
        window.location.href = 'dashboard.html';
    });
}

// --- SAVE JOB ---
window.saveJob = function(id, title, company, logo) {
    const saved = JSON.parse(localStorage.getItem('my_saved_jobs')) || [];
    if(saved.some(j => j.id === id)) {
        alert("Job already saved!");
        return;
    }
    saved.push({id, title, company, logo});
    localStorage.setItem('my_saved_jobs', JSON.stringify(saved));
    alert("Job Saved to Dashboard!");
}

// --- FILTERS ---
window.applyFilters = function() {
    const keyword = document.getElementById('keyword-filter').value.toLowerCase();
    const location = document.getElementById('location-filter').value.toLowerCase();
    const minSalary = parseInt(document.getElementById('salary-range').value) * 1000;
    const sortValue = document.getElementById('sort-jobs').value;
    const checkedTypes = Array.from(document.querySelectorAll('.checkbox-group input:checked')).map(cb => cb.value.toLowerCase());

    // Update our global filtered list
    filteredJobs = allJobs.filter(job => {
        const matchKeyword = job.title.toLowerCase().includes(keyword) || job.company.toLowerCase().includes(keyword);
        const matchLocation = job.location.toLowerCase().includes(location);
        let matchType = true;
        if (checkedTypes.length > 0) {
            matchType = checkedTypes.some(t => {
                if (t === 'remote') return job.isRemote;
                return job.type && job.type.toLowerCase().includes(t);
            });
        }
        let matchSalary = true;
        // Fix: Use a safe fallback for salary number if it's missing
        const safeSalaryNum = job.salaryNum || 0; 
        if (minSalary > 0) matchSalary = safeSalaryNum >= minSalary;
        return matchKeyword && matchLocation && matchType && matchSalary;
    });

    if (sortValue === 'salary') filteredJobs.sort((a, b) => (b.salaryNum || 0) - (a.salaryNum || 0));
    else filteredJobs.sort((a, b) => b.id - a.id); 

    // Reset to page 1 whenever a filter is applied!
    currentPage = 1;
    
    // Render the paginated view!
    renderJobs();
    
    const countSpan = document.getElementById('job-count');
    if(countSpan) countSpan.textContent = `Showing ${filteredJobs.length} Jobs`;
}

// --- SALARY FILTER (NEW FUNCTION) ---
window.filterSalaries = function() {
    const query = document.getElementById('salary-search').value.toLowerCase();
    const filtered = salaryStats.filter(s => s.title.toLowerCase().includes(query));
    renderSalaries(filtered);
}

window.updateSalaryLabel = function(val) {
    document.getElementById('salary-val').textContent = val;
}

window.resetFilters = function() {
    document.getElementById('keyword-filter').value = "";
    document.getElementById('location-filter').value = "";
    document.getElementById('salary-range').value = 0;
    updateSalaryLabel(0);
    document.querySelectorAll('.checkbox-group input').forEach(cb => cb.checked = false);
    document.getElementById('sort-jobs').value = "newest";
    window.history.pushState({}, document.title, window.location.pathname);
    applyFilters();
}

window.filterHomeTabs = function(element, category) {
    const options = document.querySelectorAll('.view-options span');
    options.forEach(opt => opt.classList.remove('active'));
    element.classList.add('active');
    let filteredJobs = jobs;
    if (category === 'full time') filteredJobs = jobs.filter(job => job.type.toLowerCase().includes('full'));
    else if (category === 'remote') filteredJobs = jobs.filter(job => job.isRemote);
    renderHomeJobs(filteredJobs);
}

window.searchJobs = function() {
    const keyword = document.getElementById('job-search').value;
    const location = document.getElementById('location-search').value;
    window.location.href = `jobs.html?keyword=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}`;
}

function processCompanies(data) {
    const companyMap = {};
    data.forEach(job => {
        if (!companyMap[job.company]) companyMap[job.company] = { name: job.company, logo: job.logo, openJobs: 0 };
        companyMap[job.company].openJobs++;
    });
    companies = Object.values(companyMap);
}

function processSalaries(data) {
    const roleMap = {};
    data.forEach(job => {
        let title = job.title.split('(')[0].split('-')[0].trim();
        if (!roleMap[title]) roleMap[title] = { title: title, total: 0, count: 0, rawSalaries: [] };
        if (job.salaryNum > 0) { roleMap[title].total += job.salaryNum; roleMap[title].count++; }
        roleMap[title].rawSalaries.push(job.salary);
    });
    salaryStats = Object.values(roleMap).map(r => ({
        title: r.title,
        avg: r.count > 0 ? Math.round(r.total / r.count) : 0,
        samples: r.rawSalaries.length
    })).sort((a, b) => b.avg - a.avg);
}

function renderHomeJobs(data) {
    const container = document.getElementById('jobs-container');
    if (!container) return;
    container.innerHTML = "";
    if (data.length === 0) { container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #888;">No jobs found in this category.</p>`; return; }
    data.slice(0, 6).forEach(job => appendJobCard(container, job, false));
}

function renderAllJobs(data) {
    const container = document.getElementById('all-jobs-container');
    if (!container) return;
    container.innerHTML = "";
    if(data.length === 0) { container.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#888;">No jobs found matching your criteria.</p>`; return; }
    data.forEach(job => appendJobCard(container, job, true));
}

function appendJobCard(container, job, isWide) {
    const card = document.createElement('div');
    const saveJob = `event.stopPropagation(); saveJob(${job.id}, '${job.title.replace(/'/g, "\\'")}', '${job.company.replace(/'/g, "\\'")}', '${job.logo}')`;
    
    if (isWide) {
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
                <div class="action-row">
                    <button class="btn-save" onclick="${saveJob}" title="Save Job"><i class="far fa-bookmark"></i></button>
                    <button class="btn-primary" onclick="openJobDetails(${job.id})">View Details</button>
                </div>
            </div>
        `;
    } else {
        card.classList.add('job-card');
        card.innerHTML = `
            <div class="job-card-header">
                <div class="company-logo">${job.logo}</div>
                <div class="header-text">
                    <h3 class="job-title">${job.title}</h3>
                    <p class="company-name">${job.company}</p>
                </div>
            </div>
            <span class="job-type">${job.type}</span>
            <div class="job-details">
                <span><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
                <span><i class="fas fa-money-bill-wave"></i> ${job.salary}</span>
            </div>
            <button class="apply-btn" onclick="openJobDetails(${job.id})">View Details</button>
        `;
    }
    container.appendChild(card);
}

function renderCompanies(data) {
    const container = document.getElementById('companies-container');
    if (!container) return;
    container.innerHTML = "";
    data.forEach(comp => {
        const card = document.createElement('div');
        card.classList.add('company-card');
        card.innerHTML = `
            <div class="company-logo-large">${comp.logo}</div>
            <h3>${comp.name}</h3>
            <div class="company-rating" style="margin: 5px 0;">
                <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star-half-alt"></i>
            </div>
            <div class="open-jobs-tag">${comp.openJobs} Open Jobs</div>
            <button class="btn-secondary" onclick="window.location.href='company-profile.html?company=${encodeURIComponent(comp.name)}'" style="margin-top:1.5rem; width:100%;">View Profile</button>
        `;
        container.appendChild(card);
    });
}

function renderSalaries(data) {
    const container = document.getElementById('salaries-container');
    if (!container) return;
    container.innerHTML = "";
    
    if (data.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#888;">No salaries found matching your search.</p>`;
        return;
    }

    const maxVal = Math.max(...data.map(d => d.avg)) || 20000;
    data.forEach(stat => {
        let width = (stat.avg / maxVal) * 100;
        if(width > 100) width = 100; if(width < 10) width = 10;
        const card = document.createElement('div');
        card.classList.add('salary-card');
        card.innerHTML = `
            <div class="salary-info">
                <h3>${stat.title}</h3>
                <p class="text-muted" style="font-size:0.9rem;">Based on ${stat.samples} offers</p>
            </div>
            <div class="salary-visual">
                <div class="salary-bar-bg"><div class="salary-bar-fill" style="width: ${stat.avg > 0 ? width : 0}%;">${stat.avg > 0 ? `<div class="salary-marker"></div>` : ''}</div></div>
                <div class="salary-value">${stat.avg > 0 ? stat.avg.toLocaleString() + ' EGP' : 'N/A'}</div>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderCompanyProfile(companyName, allJobs) {
    const companyJobs = allJobs.filter(j => j.company === companyName);
    if(companyJobs.length === 0) {
        document.getElementById('company-profile-header').innerHTML = `<h2 style="text-align:center; color:white;">Company Not Found</h2>`;
        return;
    }
    const companyInfo = { name: companyName, logo: companyJobs[0].logo, count: companyJobs.length };
    document.getElementById('company-profile-header').innerHTML = `
        <div class="company-logo-large" style="margin: 0 auto 1rem auto; display:flex;">${companyInfo.logo}</div>
        <h1 style="text-align:center; color:white; margin-bottom:0.5rem; font-size: 2.5rem;">${companyInfo.name}</h1>
        <div style="display:flex; justify-content:center; gap:1rem; margin-top:1rem;">
            <span class="open-jobs-tag" style="margin:0; background:#333; color:white; border:1px solid #555;">Technology</span>
            <span class="open-jobs-tag" style="margin:0;">${companyInfo.count} Active Positions</span>
        </div>
    `;
    const jobsContainer = document.getElementById('company-jobs-container');
    jobsContainer.innerHTML = "";
    companyJobs.forEach(job => appendJobCard(jobsContainer, job, true));
}

function openJobDetails(jobId) {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    document.getElementById('modal-title').textContent = job.title;
    document.getElementById('modal-company').textContent = job.company;
    document.getElementById('modal-salary').textContent = job.salary;
    document.getElementById('modal-location').textContent = job.location;
    document.getElementById('modal-hours').textContent = job.hours;
    document.getElementById('modal-logo').textContent = job.logo;
    
    const reqContainer = document.getElementById('modal-requirements');
    if (Array.isArray(job.requirements) && job.requirements.length > 0) {
        reqContainer.innerHTML = `<ul>${job.requirements.map(item => `<li>${item}</li>`).join('')}</ul>`;
    } else {
        reqContainer.innerHTML = "<p class='text-muted'>No specific requirements listed.</p>";
    }
    document.getElementById('modal-description').textContent = job.description || "No description provided.";
    document.getElementById('modal-training').textContent = job.training || "Not specified.";
    document.getElementById('job-modal').classList.add('open');
}

function closeJobModal() { document.getElementById('job-modal').classList.remove('open'); }

window.addEventListener('click', (e) => { if (e.target === document.getElementById('job-modal')) closeJobModal(); });

// --- AUTH ---
document.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('user');
    const authButtons = document.querySelector('.auth-buttons');
    if (authButtons && userStr) {
        const user = JSON.parse(userStr);
        authButtons.innerHTML = `
            <a href="dashboard.html" class="btn-text"><i class="fas fa-user-circle"></i> ${user.name.split(' ')[0]}</a>
            <a onclick="globalLogout()" class="btn-primary" style="cursor:pointer;">Logout</a>
        `;
    } else if (authButtons) {
        authButtons.innerHTML = `
            <a href="login.html" class="btn-text">Log In</a>
            <a href="login.html" class="btn-primary">Sign Up</a>
        `;
    }
});
window.globalLogout = function() { localStorage.removeItem('user'); window.location.href = 'index.html'; }


// --- MOBILE HAMBURGER MENU FIX ---
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const authButtons = document.querySelector('.auth-buttons');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            if (navLinks) navLinks.classList.toggle('show-menu');
            if (authButtons) authButtons.classList.toggle('show-menu');
        });
    }
});

