// Mock Data for Jobs
const jobs = [
    {
        id: 1,
        title: "Frontend Developer",
        company: "TechFlow",
        location: "New York, NY",
        type: "Full Time",
        salary: "$80k - $120k",
        logo: "TF"
    },
    {
        id: 2,
        title: "UX/UI Designer",
        company: "Creative Studio",
        location: "Remote",
        type: "Contract",
        salary: "$60k - $90k",
        logo: "CS"
    },
    {
        id: 3,
        title: "Product Manager",
        company: "Innovate Inc.",
        location: "San Francisco, CA",
        type: "Full Time",
        salary: "$110k - $150k",
        logo: "II"
    },
    {
        id: 4,
        title: "Data Analyst",
        company: "DataCorp",
        location: "Austin, TX",
        type: "Full Time",
        salary: "$70k - $100k",
        logo: "DC"
    },
    {
        id: 5,
        title: "Backend Engineer",
        company: "ServerSide",
        location: "Remote",
        type: "Part Time",
        salary: "$50/hr",
        logo: "SS"
    },
    {
        id: 6,
        title: "Marketing Specialist",
        company: "GrowthX",
        location: "London, UK",
        type: "Full Time",
        salary: "£40k - £60k",
        logo: "GX"
    }
];

const jobsContainer = document.getElementById('jobs-container');
const modal = document.getElementById('apply-modal');
const closeModalBtn = document.querySelector('.close-modal');
const modalTitle = document.getElementById('modal-job-title');

// Render Jobs
function renderJobs(jobsData) {
    jobsContainer.innerHTML = "";
    
    if (jobsData.length === 0) {
        jobsContainer.innerHTML = "<p>No jobs found matching your criteria.</p>";
        return;
    }

    jobsData.forEach(job => {
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
        
        jobsContainer.appendChild(jobCard);
    });
}

// Initial Render
renderJobs(jobs);

// Search / Filter Function
function filterJobs() {
    const keyword = document.getElementById('job-search').value.toLowerCase();
    const location = document.getElementById('location-search').value.toLowerCase();

    const filtered = jobs.filter(job => {
        const matchKeyword = job.title.toLowerCase().includes(keyword) || job.company.toLowerCase().includes(keyword);
        const matchLocation = job.location.toLowerCase().includes(location);
        return matchKeyword && matchLocation;
    });

    renderJobs(filtered);
}

// Modal Functions
function openModal(jobTitle) {
    modalTitle.textContent = `Apply for ${jobTitle}`;
    modal.classList.add('open');
}

closeModalBtn.addEventListener('click', () => {
    modal.classList.remove('open');
});

// Close modal if clicking outside content
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('open');
    }
});

// Form Submission (Prevent Default)
document.querySelector('.apply-form').addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Application Submitted Successfully!');
    modal.classList.remove('open');
});