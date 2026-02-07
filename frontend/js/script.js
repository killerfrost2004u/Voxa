// --- 1. Mock Data ---
const jobs = [
    { id: 1, title: "Frontend Developer", company: "TechFlow", location: "New York, NY", type: "Full Time", salary: "$80k - $120k", logo: "TF" },
    { id: 2, title: "UX/UI Designer", company: "Creative Studio", location: "Remote", type: "Contract", salary: "$60k - $90k", logo: "CS" },
    { id: 3, title: "Product Manager", company: "Innovate Inc.", location: "San Francisco, CA", type: "Full Time", salary: "$110k - $150k", logo: "II" },
    { id: 4, title: "Data Analyst", company: "DataCorp", location: "Austin, TX", type: "Full Time", salary: "$70k - $100k", logo: "DC" },
    { id: 5, title: "Backend Engineer", company: "ServerSide", location: "Remote", type: "Part Time", salary: "$50/hr", logo: "SS" },
    { id: 6, title: "Marketing Specialist", company: "GrowthX", location: "London, UK", type: "Full Time", salary: "£40k - £60k", logo: "GX" },
    { id: 7, title: "DevOps Engineer", company: "CloudNet", location: "Remote", type: "Full Time", salary: "$130k", logo: "CN" },
    { id: 8, title: "Junior Web Dev", company: "StartUp One", location: "Boston, MA", type: "Entry Level", salary: "$60k", logo: "S1" }
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
                    <span class="tag">New</span>
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

            // Mock Salary Logic (Filter if salary string contains number > slider)
            // This is a simple mock. In real apps, you'd parse the salary integer.
            // For now, we just return true to demonstrate the UI flow.
            
            return matchKeyword && matchLocation && matchType;
        });

        renderAllJobs(filtered);
    }

    // Sort Function
    window.sortJobs = function() {
        const sortValue = document.getElementById('sort-jobs').value;
        let sortedJobs = [...jobs]; // Copy array

        if (sortValue === 'salary') {
            // Mock sort: assume longer string = higher salary for demo
            sortedJobs.sort((a, b) => b.salary.length - a.salary.length);
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