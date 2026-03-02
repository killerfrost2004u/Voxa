const API_URL = "http://127.0.0.1:5000/api";
let jobs = []; // Keep this for legacy functions if needed, but we will rely on allJobs
let companies = []; 
let salaryStats = []; 

// --- PAGINATION VARIABLES (Global Scope) ---
window.allJobs = [];
window.filteredJobs = [];
window.currentPage = 1;
const jobsPerPage = 10; 

// --- LOAD JOBS (GLOBAL) ---
async function loadJobs() {
    try {
        const res = await fetch('http://127.0.0.1:5000/api/jobs');
        window.allJobs = await res.json();
        
        // Initialize filteredJobs with all fetched jobs
        window.filteredJobs = [...window.allJobs];
        
        // --- PAGE SPECIFIC ROUTING ---
        const path = window.location.pathname;

        if (path.includes('jobs.html')) {
            updateJobCount();
            renderJobs();
        } 
        else if (path.includes('companies.html')) {
            processCompanies(window.allJobs);
            renderCompanies(companies);
        } 
        else if (path.includes('salaries.html')) {
            processSalaries(window.allJobs);
            renderSalaries(salaryStats);
        }
        else if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
            // Render the top 6 jobs for the homepage
            renderHomeJobs(window.allJobs);
        }

    } catch (err) {
        console.error("Failed to load data:", err);
    }
}

function updateJobCount() {
    const countSpan = document.getElementById('job-count');
    if (countSpan) countSpan.innerText = `${window.filteredJobs.length} Jobs Found`;
}

// --- RENDER 10 JOBS PER PAGE ---
window.renderJobs = function() {
    const container = document.getElementById('all-jobs-container');
    if (!container) return; // Failsafe if we aren't on jobs.html

    // 1. Calculate which 10 jobs to show from the FILTERED list
    const startIndex = (window.currentPage - 1) * jobsPerPage;
    const endIndex = startIndex + jobsPerPage;
    const jobsToShow = window.filteredJobs.slice(startIndex, endIndex);

    // 2. Clear the container
    container.innerHTML = "";

    // 3. Render the job cards
    if(jobsToShow.length === 0) { 
        container.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#888;">No jobs found matching your criteria.</p>`; 
    } else {
        jobsToShow.forEach(job => appendJobCard(container, job, true));
    }

    // 4. Build Controls via DOM
    buildPaginationControls();
}

// --- BUILD PAGINATION CONTROLS (DOM Method) ---
window.buildPaginationControls = function() {
    const pageDiv = document.querySelector('.pagination'); // Using querySelector to find the class
    if (!pageDiv) return;

    pageDiv.innerHTML = ""; // Clear existing buttons

    const totalPages = Math.ceil(window.filteredJobs.length / jobsPerPage);
    
    // Don't show pagination if there's only 1 page
    if (totalPages <= 1) return;

    // Helper function to create safe DOM buttons
    const createButton = (text, isIcon, isDisabled, isActive, pageTarget) => {
        const btn = document.createElement('button');
        btn.className = 'page-btn';
        if (isDisabled) btn.classList.add('disabled');
        if (isActive) btn.classList.add('active');
        
        btn.innerHTML = isIcon ? `<i class="fas fa-chevron-${text}"></i>` : text;

        if (!isDisabled && !isActive) {
            btn.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent default button behavior
                window.currentPage = pageTarget;
                window.renderJobs();
                // Smooth scroll to top
                const feedHeader = document.querySelector('.feed-header');
                if (feedHeader) feedHeader.scrollIntoView({ behavior: 'smooth' });
            });
        }
        return btn;
    };

    // Prev Button
    pageDiv.appendChild(createButton('left', true, window.currentPage === 1, false, window.currentPage - 1));

    // Number Buttons
    for (let i = 1; i <= totalPages; i++) {
        pageDiv.appendChild(createButton(i, false, false, i === window.currentPage, i));
    }

    // Next Button
    pageDiv.appendChild(createButton('right', true, window.currentPage === totalPages, false, window.currentPage + 1));
}

// --- INITIALIZE SCRIPT ON EVERY PAGE ---
document.addEventListener('DOMContentLoaded', () => {
    loadJobs();
});

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
    // Fix: Search allJobs instead of empty jobs array
    const job = window.allJobs.find(j => j.title === title && j.company === company);
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

    // Fix: Filter against window.allJobs, not the empty jobs array
    window.filteredJobs = window.allJobs.filter(job => {
        const matchKeyword = (job.title && job.title.toLowerCase().includes(keyword)) || 
                             (job.company && job.company.toLowerCase().includes(keyword));
        const matchLocation = job.location && job.location.toLowerCase().includes(location);
        
        let matchType = true;
        if (checkedTypes.length > 0) {
            matchType = checkedTypes.some(t => {
                if (t === 'remote') return job.isRemote;
                return job.type && job.type.toLowerCase().includes(t);
            });
        }
        
        let matchSalary = true;
        const safeSalaryNum = job.salaryNum || 0;
        if (minSalary > 0) matchSalary = safeSalaryNum >= minSalary;
        
        return matchKeyword && matchLocation && matchType && matchSalary;
    });

    if (sortValue === 'salary') {
        window.filteredJobs.sort((a, b) => (b.salaryNum || 0) - (a.salaryNum || 0));
    } else {
        window.filteredJobs.sort((a, b) => b.id - a.id); 
    }

    // Reset to page 1 and render
    window.currentPage = 1;
    updateJobCount();
    window.renderJobs();
}

// --- SALARY FILTER ---
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
    
    // Reset filtered jobs to all jobs
    window.filteredJobs = [...window.allJobs];
    window.currentPage = 1;
    
    updateJobCount();
    window.renderJobs();
}

window.filterHomeTabs = function(element, category) {
    const options = document.querySelectorAll('.view-options span');
    options.forEach(opt => opt.classList.remove('active'));
    element.classList.add('active');
    
    // Fix: Filter against allJobs
    let filteredForHome = window.allJobs;
    if (category === 'full time') {
        filteredForHome = window.allJobs.filter(job => job.type && job.type.toLowerCase().includes('full'));
    } else if (category === 'remote') {
        filteredForHome = window.allJobs.filter(job => job.isRemote);
    }
    renderHomeJobs(filteredForHome);
}

window.searchJobs = function() {
    const keyword = document.getElementById('job-search').value;
    const location = document.getElementById('location-search').value;
    window.location.href = `jobs.html?keyword=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}`;
}

// --- RENDER HELPERS ---
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
                    <span><i class="fas fa-map-marker-alt"></i> ${job.location || 'Remote'}</span>
                    <span><i class="fas fa-money-bill-wave"></i> ${job.salary || 'Competitive'}</span>
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
            <span class="job-type">${job.type || 'Full Time'}</span>
            <div class="job-details">
                <span><i class="fas fa-map-marker-alt"></i> ${job.location || 'Remote'}</span>
                <span><i class="fas fa-money-bill-wave"></i> ${job.salary || 'Competitive'}</span>
            </div>
            <button class="apply-btn" onclick="openJobDetails(${job.id})">View Details</button>
        `;
    }
    container.appendChild(card);
}

function openJobDetails(jobId) {
    // Fix: Search allJobs
    const job = window.allJobs.find(j => j.id === jobId);
    if (!job) return;
    document.getElementById('modal-title').textContent = job.title;
    document.getElementById('modal-company').textContent = job.company;
    document.getElementById('modal-salary').textContent = job.salary || 'Competitive';
    document.getElementById('modal-location').textContent = job.location || 'Remote';
    document.getElementById('modal-hours').textContent = job.hours || 'Standard';
    document.getElementById('modal-logo').textContent = job.logo;
    
    const reqContainer = document.getElementById('modal-requirements');
    if (job.requirements) {
        reqContainer.innerHTML = `<p class="text-block">${job.requirements}</p>`;
    } else {
        reqContainer.innerHTML = "<p class='text-muted'>No specific requirements listed.</p>";
    }
    document.getElementById('modal-description').textContent = job.description || "No description provided.";
    document.getElementById('modal-training').textContent = job.training || "Not specified.";
    document.getElementById('job-modal').classList.add('open');
}

function closeJobModal() { 
    const modal = document.getElementById('job-modal');
    if (modal) modal.classList.remove('open'); 
}

window.addEventListener('click', (e) => { 
    if (e.target === document.getElementById('job-modal')) closeJobModal(); 
});

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

function processSalaries(data) {
    const roleMap = {};
    data.forEach(job => {
        if(!job.title) return; // Safety check
        let title = job.title.split('(')[0].split('-')[0].trim();
        if (!roleMap[title]) roleMap[title] = { title: title, total: 0, count: 0, rawSalaries: [] };
        
        // Extract a number from the string (e.g. "15k" -> 15000) if salaryNum is missing
        let parsedSalary = 0;
        if (job.salaryNum && job.salaryNum > 0) {
            parsedSalary = job.salaryNum;
        } else if (job.salary) {
            const match = job.salary.match(/(\d+)/);
            if (match) parsedSalary = parseInt(match[0]) * 1000;
        }

        if (parsedSalary > 0) { 
            roleMap[title].total += parsedSalary; 
            roleMap[title].count++; 
        }
        roleMap[title].rawSalaries.push(job.salary || "N/A");
    });
    
    salaryStats = Object.values(roleMap).map(r => ({
        title: r.title,
        avg: r.count > 0 ? Math.round(r.total / r.count) : 0,
        samples: r.rawSalaries.length
    })).sort((a, b) => b.avg - a.avg);
}