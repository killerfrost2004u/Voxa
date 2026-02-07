[cite_start]// --- 1. Real Data from "Wolves Master sheet 2" [cite: 1] ---

const jobs = [
    { 
        id: 1, 
        title: "Back Office Agent", 
        company: "Ilead", 
        location: "Nasr City, Cairo", 
        type: "Full Time", 
        salary: "11k Net + 3k KPI", 
        logo: "IL" 
    },
    { 
        id: 2, 
        title: "Telesales Agent (US Account)", 
        company: "TTC", 
        location: "Nasr City, Cairo", 
        type: "Full Time", 
        salary: "12k Net + Comms", 
        logo: "TTC" 
    },
    { 
        id: 3, 
        title: "Cold Caller (Solar Campaign)", 
        company: "Win Global Solutions", 
        location: "Remote / WFH", 
        type: "Part Time", 
        salary: "7.5k Basic + Bonus", 
        logo: "WGS" 
    },
    { 
        id: 4, 
        title: "Telemarketer Agent", 
        company: "Evolve LLC", 
        location: "Nasr City, Cairo", 
        type: "Full Time", 
        salary: "10k Basic + 10k Comm", 
        logo: "EV" 
    },
    { 
        id: 5, 
        title: "Contract Coordinator", 
        company: "Real Estate Journey", 
        location: "Remote", 
        type: "Full Time", 
        salary: "17k Basic", 
        logo: "REJ" 
    },
    { 
        id: 6, 
        title: "Transfer Agent", 
        company: "Contact Center Source", 
        location: "Maadi, Cairo", 
        type: "Full Time", 
        salary: "11k Net + 3k KPI", 
        logo: "CCS" 
    },
    { 
        id: 7, 
        title: "Canadian Telesales", 
        company: "LeadBull", 
        location: "Zahraa El Maadi", 
        type: "Full Time", 
        salary: "15k Net + 5k KPI", 
        logo: "LB" 
    },
    { 
        id: 8, 
        title: "Inside Sales Agent", 
        company: "CataLeads", 
        location: "Nasr City, Cairo", 
        type: "Full Time", 
        salary: "$3 - $4 / Hour", 
        logo: "CL" 
    },
    { 
        id: 9, 
        title: "Acquisition Specialist", 
        company: "Volume X", 
        location: "Remote", 
        type: "Full Time", 
        salary: "$4.2 / Hour + Comm", 
        logo: "VX" 
    },
    { 
        id: 10, 
        title: "Customer Support (English)", 
        company: "Teleperformance", 
        location: "New Cairo", 
        type: "Rotational", 
        salary: "Up to 19k EGP", 
        logo: "TP" 
    },
    { 
        id: 11, 
        title: "Customer Support (German)", 
        company: "Teleperformance", 
        location: "New Cairo", 
        type: "Full Time", 
        salary: "Up to 33.7k EGP", 
        logo: "TP" 
    },
    { 
        id: 12, 
        title: "Travel Advisor", 
        company: "Alorica", 
        location: "Sheikh Zayed", 
        type: "Full Time", 
        salary: "Up to 18.7k Gross", 
        logo: "AL" 
    },
    { 
        id: 13, 
        title: "Bilingual Support (French)", 
        company: "IntouchCX", 
        location: "Maadi Tech Park", 
        type: "Full Time", 
        salary: "Up to 30k Gross", 
        logo: "ICX" 
    },
    { 
        id: 14, 
        title: "Call Center Agent", 
        company: "Sutherland", 
        location: "New Cairo", 
        type: "Full Time", 
        salary: "17.3k Net + Allowance", 
        logo: "SU" 
    },
    { 
        id: 15, 
        title: "Social Media Specialist", 
        company: "Outsourcing 4U", 
        location: "Maadi, Cairo", 
        type: "Full Time", 
        salary: "7.5k Net", 
        logo: "O4U" 
    }
];

const companies = [
    { 
        id: 1, 
        name: "Teleperformance", 
        rating: 4.8, 
        reviews: 1500, 
        openJobs: 3, 
        logo: "TP", 
        industry: "BPO / Call Center" 
    },
    { 
        id: 2, 
        name: "Win Global Solutions", 
        rating: 4.5, 
        reviews: 120, 
        openJobs: 5, 
        logo: "WGS", 
        industry: "Solar / Marketing" 
    },
    { 
        id: 3, 
        name: "Concentrix", 
        rating: 4.6, 
        reviews: 900, 
        openJobs: 2, 
        logo: "CNX", 
        industry: "Customer Experience" 
    },
    { 
        id: 4, 
        name: "Sutherland", 
        rating: 4.4, 
        reviews: 500, 
        openJobs: 1, 
        logo: "SU", 
        industry: "IT & BPO" 
    },
    { 
        id: 5, 
        name: "Volume X", 
        rating: 4.7, 
        reviews: 45, 
        openJobs: 1, 
        logo: "VX", 
        industry: "Real Estate Acquisition" 
    },
    { 
        id: 6, 
        name: "Ilead", 
        rating: 4.2, 
        reviews: 80, 
        openJobs: 2, 
        logo: "IL", 
        industry: "Medical / DME" 
    },
    { 
        id: 7, 
        name: "Alorica", 
        rating: 4.3, 
        reviews: 300, 
        openJobs: 4, 
        logo: "AL", 
        industry: "Travel & Support" 
    }
];

const salaries = [
    { title: "German Customer Support", avg: 33, range: "30k - 33.7k", percent: 95 },
    { title: "French Customer Support", avg: 24, range: "20k - 30k", percent: 80 },
    { title: "English Call Center", avg: 15, range: "10k - 19k", percent: 50 },
    { title: "Real Estate Coordinator", avg: 17, range: "14k - 20k", percent: 60 },
    { title: "Telesales Agent", avg: 12, range: "8k - 15k + Comm", percent: 40 },
    { title: "Cold Caller (Remote)", avg: 8, range: "7k - 14k", percent: 30 },
    { title: "Acquisition Specialist", avg: 25, range: "$4.2/hr (~25k EGP)", percent: 85 }
];


// --- 2. Shared Modal Logic (Available on all pages) ---
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

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        modal.classList.remove('open');
    });
}

if (modal) {
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('open');
        }
    });
}

if (applyForm) {
    applyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Application Submitted Successfully!');
        modal.classList.remove('open');
    });
}


// --- 3. Home Page Logic (Grid View) ---
const homeJobsContainer = document.getElementById('jobs-container');

if (homeJobsContainer) {
    // Render first 6 jobs for home page
    function renderHomeJobs(data) {
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
                <button class="apply-btn" onclick="openModal('${job.title}')">Apply Now</button>
            `;
            homeJobsContainer.appendChild(jobCard);
        });
    }

    renderHomeJobs(jobs);

    // Simple search for home page
    window.filterHomeJobs = function() {
        const keyword = document.getElementById('job-search').value.toLowerCase();
        const location = document.getElementById('location-search').value.toLowerCase();
        
        const filtered = jobs.filter(job => {
            const matchKeyword = job.title.toLowerCase().includes(keyword) || job.company.toLowerCase().includes(keyword);
            const matchLocation = job.location.toLowerCase().includes(location);
            return matchKeyword && matchLocation;
        });
        
        renderHomeJobs(filtered);
    }
}


// --- 4. Jobs Page Logic (List View + Sidebar) ---
const allJobsContainer = document.getElementById('all-jobs-container');

if (allJobsContainer) {
    // Render all jobs in wide format
    function renderAllJobs(data) {
        allJobsContainer.innerHTML = "";
        const countSpan = document.getElementById('job-count');
        if(countSpan) countSpan.textContent = `Showing ${data.length} Jobs`;

        if (data.length === 0) {
            allJobsContainer.innerHTML = "<div style='text-align:center; padding:2rem; width:100%; color:#666;'>No jobs found matching your criteria.</div>";
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
                        <span><i class="fas fa-briefcase"></i> ${job.type}</span>
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

    // Initial render
    renderAllJobs(jobs);

    // Advanced Filter Function
    window.applyFilters = function() {
        const keyword = document.getElementById('keyword-filter').value.toLowerCase();
        const location = document.getElementById('location-filter').value.toLowerCase();
        const salaryVal = document.getElementById('salary-range').value;
        
        // Get checked job types
        const checkedTypes = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);

        const filtered = jobs.filter(job => {
            // Text matching
            const matchKeyword = job.title.toLowerCase().includes(keyword) || job.company.toLowerCase().includes(keyword);
            const matchLocation = job.location.toLowerCase().includes(location);
            
            // Checkbox matching (if none checked, return true for all)
            const matchType = checkedTypes.length === 0 || checkedTypes.includes(job.type);

            return matchKeyword && matchLocation && matchType;
        });

        renderAllJobs(filtered);
    }

    // Sort Function
    window.sortJobs = function() {
        const sortValue = document.getElementById('sort-jobs').value;
        let sortedJobs = [...jobs]; // Copy array

        if (sortValue === 'salary') {
            // Sorting based on approximate salary value
            sortedJobs.sort((a, b) => {
                // Extract the first number from the salary string to compare
                const valA = parseInt(a.salary.replace(/\D/g, '')) || 0;
                const valB = parseInt(b.salary.replace(/\D/g, '')) || 0;
                return valB - valA;
            });
        } else {
            // Sort by ID (Newest first)
            sortedJobs.sort((a, b) => b.id - a.id);
        }
        renderAllJobs(sortedJobs);
    }

    // Slider UI Update
    const slider = document.getElementById('salary-range');
    const output = document.getElementById('salary-val');
    if(slider) {
        slider.oninput = function() {
            output.innerHTML = this.value;
        }
    }
}


// --- 5. Companies Page Logic ---
const companiesContainer = document.getElementById('companies-container');

if (companiesContainer) {
    function renderCompanies(data) {
        companiesContainer.innerHTML = "";
        data.forEach(company => {
            // Generate Stars HTML
            let starsHtml = '';
            for(let i=1; i<=5; i++) {
                if(i <= Math.floor(company.rating)) {
                    starsHtml += '<i class="fas fa-star"></i>';
                } else if (i === Math.ceil(company.rating) && !Number.isInteger(company.rating)) {
                    starsHtml += '<i class="fas fa-star-half-alt"></i>';
                } else {
                    starsHtml += '<i class="far fa-star"></i>';
                }
            }

            const card = document.createElement('div');
            card.className = 'company-card';
            card.innerHTML = `
                <div class="company-logo-large">${company.logo}</div>
                <h3>${company.name}</h3>
                <div class="company-rating">
                    ${starsHtml} <span>(${company.reviews} Reviews)</span>
                </div>
                <p style="color:var(--text-light); font-size:0.9rem;">${company.industry}</p>
                <div class="open-jobs-tag">${company.openJobs} Open Jobs</div>
                <button class="btn-secondary" style="margin-top:1rem; width:100%;">View Profile</button>
            `;
            companiesContainer.appendChild(card);
        });
    }

    renderCompanies(companies);

    // Filter Logic for Companies
    window.filterCompanies = function() {
        const term = document.getElementById('company-search').value.toLowerCase();
        const filtered = companies.filter(c => c.name.toLowerCase().includes(term));
        renderCompanies(filtered);
    }
}


// --- 6. Salaries Page Logic ---
const salariesContainer = document.getElementById('salaries-container');

if (salariesContainer) {
    function renderSalaries(data) {
        salariesContainer.innerHTML = "";
        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'salary-card';
            card.innerHTML = `
                <div class="salary-info">
                    <h3>${item.title}</h3>
                    <p style="color:var(--text-light);">Average Salary</p>
                    <div style="font-size:1.5rem; font-weight:bold; color:#059669;">${item.avg}k <span style="font-size:0.9rem; color:var(--text-light); font-weight:400;">/ year (est)</span></div>
                </div>
                <div class="salary-visual">
                    <span style="font-size:0.8rem; font-weight:600;">Low</span>
                    <div class="salary-bar-bg">
                        <div class="salary-bar-fill" style="width: ${item.percent}%;">
                            <div class="salary-marker"></div>
                        </div>
                    </div>
                    <span style="font-size:0.8rem; font-weight:600;">High</span>
                </div>
                <div class="salary-range" style="width:100%; text-align:right; font-size:0.9rem; color:var(--text-light); margin-top:0.5rem;">
                    Range: ${item.range}
                </div>
            `;
            salariesContainer.appendChild(card);
        });
    }

    renderSalaries(salaries);

    // Filter Logic for Salaries
    window.filterSalaries = function() {
        const term = document.getElementById('salary-search').value.toLowerCase();
        const filtered = salaries.filter(s => s.title.toLowerCase().includes(term));
        renderSalaries(filtered);
    }
}

// --- 7. Global Authentication Logic (Keeps user logged in) ---
document.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('user');
    const authButtons = document.querySelector('.auth-buttons');

    if (authButtons) {
        if (userStr) {
            // User IS logged in: Show Name & Logout
            const user = JSON.parse(userStr);
            const firstName = user.name.split(' ')[0];
            
            authButtons.innerHTML = `
                <a href="dashboard.html" class="btn-text" style="display:flex; align-items:center; gap:8px; text-decoration:none;">
                    <i class="fas fa-user-circle"></i> ${firstName}
                </a>
                <a onclick="globalLogout()" class="btn-primary" style="cursor:pointer;">Logout</a>
            `;
        } else {
            // User is NOT logged in: Show Log In / Sign Up
            authButtons.innerHTML = `
                <a href="login.html" class="btn-text">Log In</a>
                <a href="login.html" class="btn-primary">Sign Up</a>
            `;
        }
    }
});

// Global Logout Function
window.globalLogout = function() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}