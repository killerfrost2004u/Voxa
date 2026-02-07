const API_URL = "http://127.0.0.1:5000/api";
let jobs = []; 
let companies = []; 
let salaryStats = []; 

// 1. Fetch Real Data
async function loadJobs() {
    try {
        const response = await fetch(`${API_URL}/jobs`);
        if (!response.ok) throw new Error("Failed to fetch jobs");
        
        jobs = await response.json(); 
        
        // --- DATA NORMALIZATION (Fix WFH vs Remote) ---
        // This ensures "WFH", "Work from home", etc. all show up as "Remote"
        jobs.forEach(job => {
            const loc = job.location ? job.location.toLowerCase() : '';
            const type = job.type ? job.type.toLowerCase() : '';
            
            // Define variations of Remote work
            const remoteKeywords = ['wfh', 'work from home', 'remotely', 'home'];
            
            // Check if this job is remote based on Location or Type
            const isRemote = remoteKeywords.some(k => loc.includes(k) || type.includes(k));
            
            if (isRemote) {
                // 1. Standardize the display text
                // If the location was just "WFH", change it to "Remote" for consistency
                if (loc.length < 20 && (loc.includes('wfh') || loc.includes('home'))) {
                    job.location = "Remote"; 
                }
                // 2. Add a flag for easy filtering later
                job.isRemote = true;
            }
        });

        // --- Process Companies & Salaries ---
        processCompanies(jobs);
        processSalaries(jobs);

        // --- CHECK URL PARAMETERS (For Search) ---
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('keyword') ? urlParams.get('keyword').toLowerCase() : '';
        const loc = urlParams.get('location') ? urlParams.get('location').toLowerCase() : '';

        // Filter jobs based on URL params
        let displayJobs = jobs;
        if (query || loc) {
            displayJobs = jobs.filter(job => {
                const titleMatch = job.title.toLowerCase().includes(query) || job.company.toLowerCase().includes(query);
                
                let locMatch = false;
                if (!loc) {
                    locMatch = true;
                } else {
                    // Smart Search: If user searches "Remote", include WFH/isRemote items
                    if (loc === 'remote') {
                        locMatch = job.isRemote || job.location.toLowerCase().includes('remote');
                    } else {
                        locMatch = job.location.toLowerCase().includes(loc);
                    }
                }
                return titleMatch && locMatch;
            });
        }

        // --- RENDER LOGIC ---

        if(document.getElementById('jobs-container')) {
            renderHomeJobs(jobs); 
        }
        
        if(document.getElementById('all-jobs-container')) {
            renderAllJobs(displayJobs);
            document.getElementById('job-count').textContent = `Showing ${displayJobs.length} Jobs`;
            
            if(document.getElementById('keyword-filter')) document.getElementById('keyword-filter').value = urlParams.get('keyword') || '';
            if(document.getElementById('location-filter')) document.getElementById('location-filter').value = urlParams.get('location') || '';
        }

        if(document.getElementById('companies-container')) renderCompanies(companies);
        if(document.getElementById('salaries-container')) renderSalaries(salaryStats);

        if(document.getElementById('company-profile-header')) {
            const companyName = urlParams.get('company');
            if(companyName) renderCompanyProfile(companyName, jobs);
        }

    } catch (error) {
        console.error("Error loading jobs:", error);
    }
}
loadJobs();

// --- NEW: HOME PAGE TABS FILTER ---
window.filterHomeTabs = function(element, category) {
    // 1. Update UI (Visual Active State)
    const options = document.querySelectorAll('.view-options span');
    options.forEach(opt => opt.classList.remove('active'));
    element.classList.add('active');

    // 2. Filter Data
    let filteredJobs = jobs;

    if (category === 'full time') {
        filteredJobs = jobs.filter(job => job.type.toLowerCase().includes('full'));
    } else if (category === 'remote') {
        // Use the isRemote flag we created during normalization
        filteredJobs = jobs.filter(job => job.isRemote || job.location.toLowerCase().includes('remote'));
    }

    // 3. Render
    renderHomeJobs(filteredJobs);
}

// --- SEARCH FUNCTION (Index Page) ---
window.searchJobs = function() {
    const keyword = document.getElementById('job-search').value;
    const location = document.getElementById('location-search').value;
    window.location.href = `jobs.html?keyword=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}`;
}

// --- HELPERS ---
function processCompanies(data) {
    const companyMap = {};
    data.forEach(job => {
        if (!companyMap[job.company]) {
            companyMap[job.company] = { name: job.company, logo: job.logo, openJobs: 0 };
        }
        companyMap[job.company].openJobs++;
    });
    companies = Object.values(companyMap);
}

function processSalaries(data) {
    const roleMap = {};
    data.forEach(job => {
        let title = job.title.split('(')[0].split('-')[0].trim();
        let amount = 0;
        const matches = job.salary.match(/(\d+(\.\d+)?)/g);
        if (matches) {
            let val = parseFloat(matches[0]);
            if ((val < 100 || job.salary.toLowerCase().includes('k')) && !job.salary.includes('hour') && !job.salary.includes('$')) {
                 val *= 1000;
            }
            amount = val;
        }
        if (!roleMap[title]) roleMap[title] = { title: title, total: 0, count: 0, rawSalaries: [] };
        if (amount > 0) { roleMap[title].total += amount; roleMap[title].count++; }
        roleMap[title].rawSalaries.push(job.salary);
    });
    salaryStats = Object.values(roleMap).map(r => ({
        title: r.title,
        avg: r.count > 0 ? Math.round(r.total / r.count) : 0,
        samples: r.rawSalaries.length
    })).sort((a, b) => b.avg - a.avg);
}

// --- RENDER FUNCTIONS ---
function renderHomeJobs(data) {
    const container = document.getElementById('jobs-container');
    if (!container) return;
    container.innerHTML = "";
    
    if (data.length === 0) {
        container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #888;">No jobs found in this category.</p>`;
        return;
    }

    data.slice(0, 6).forEach(job => {
        const jobCard = document.createElement('div');
        jobCard.classList.add('job-card');
        jobCard.innerHTML = `
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
        container.appendChild(jobCard);
    });
}

function renderAllJobs(data) {
    const container = document.getElementById('all-jobs-container');
    if (!container) return;
    container.innerHTML = "";

    if(data.length === 0) {
        container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #888;">No jobs found matching your search.</p>`;
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
                    <span><i class="fas fa-clock"></i> ${job.hours}</span>
                </div>
            </div>
            <div class="actions">
                <button class="btn-primary" onclick="openJobDetails(${job.id})">View Details</button>
            </div>
        `;
        container.appendChild(card);
    });
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
    companyJobs.forEach(job => {
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
        jobsContainer.appendChild(card);
    });
}

window.filterCompanies = function() {
    const term = document.getElementById('company-search').value.toLowerCase();
    const filtered = companies.filter(c => c.name.toLowerCase().includes(term));
    renderCompanies(filtered);
}

window.filterSalaries = function() {
    const term = document.getElementById('salary-search').value.toLowerCase();
    const filtered = salaryStats.filter(s => s.title.toLowerCase().includes(term));
    renderSalaries(filtered);
}

window.filterHomeJobs = function() {
    const keyword = document.getElementById('keyword-filter') ? document.getElementById('keyword-filter').value.toLowerCase() : '';
    const location = document.getElementById('location-filter') ? document.getElementById('location-filter').value.toLowerCase() : '';
    const filtered = jobs.filter(job => 
        (job.title.toLowerCase().includes(keyword) || job.company.toLowerCase().includes(keyword)) &&
        job.location.toLowerCase().includes(location)
    );
    renderAllJobs(filtered);
}

// --- MODAL ---
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
function applyForJob() { alert("Application Started!"); closeJobModal(); }
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
    }
});
window.globalLogout = function() { localStorage.removeItem('user'); window.location.href = 'index.html'; }