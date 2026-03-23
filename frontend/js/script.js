const API_URL = "https://voxa-pi-three.vercel.app/api";
let companies = [];
let salaryStats = [];

// --- GLOBAL VARIABLES ---
window.allJobs = [];
window.filteredJobs = [];
window.currentPage = 1;
const jobsPerPage = 10;

// --- INITIALIZE SCRIPT ON EVERY PAGE ---
document.addEventListener("DOMContentLoaded", () => {
  loadJobs();
});

// --- LOAD JOBS (GLOBAL) ---
async function loadJobs() {
  try {
    const res = await fetch(`${API_URL}/jobs`);
    let fetchedJobs = await res.json();

    // --- DATA NORMALIZATION ---
    // The DB doesn't provide 'type' or 'isRemote', so we smartly infer them!
    window.allJobs = fetchedJobs.map((job) => {
      // Infer Type
      job.type = job.type || "Full Time";
      if (job.hours && job.hours.toLowerCase().includes("part"))
        job.type = "Part Time";

      // Infer Remote Status
      job.isRemote = job.isRemote || false;
      if (job.location && job.location.toLowerCase().includes("remote"))
        job.isRemote = true;
      if (job.title && job.title.toLowerCase().includes("remote"))
        job.isRemote = true;

      return job;
    });

    window.filteredJobs = [...window.allJobs];

    // --- PAGE SPECIFIC ROUTING ---
    const path = window.location.pathname;

    if (path.includes("jobs.html")) {
      // Read URL parameters if the user searched from the Homepage
      const urlParams = new URLSearchParams(window.location.search);
      const kw = urlParams.get("keyword");
      const loc = urlParams.get("location");

      if (kw) {
        if (document.getElementById("keyword-filter"))
          document.getElementById("keyword-filter").value = kw;
        if (document.getElementById("job-search"))
          document.getElementById("job-search").value = kw;
      }
      if (loc) {
        if (document.getElementById("location-filter"))
          document.getElementById("location-filter").value = loc;
        if (document.getElementById("location-search"))
          document.getElementById("location-search").value = loc;
      }

      // Automatically filter and render based on URL params or defaults!
      window.applyFilters();
    } else if (path.includes("companies.html")) {
      processCompanies(window.allJobs);
      renderCompanies(companies);
    } else if (path.includes("company-profile.html")) {
      const urlParams = new URLSearchParams(window.location.search);
      const targetCompany = urlParams.get("company");
      if (targetCompany) {
        window.renderCompanyProfile(targetCompany, window.allJobs);
      } else {
        document.getElementById("company-profile-header").innerHTML =
          `<h2 style="text-align:center; color:white;">No Company Selected</h2>`;
      }
    } else if (path.includes("salaries.html")) {
      processSalaries(window.allJobs);
      renderSalaries(salaryStats);
    } else if (
      path.includes("index.html") ||
      path === "/" ||
      path.endsWith("/")
    ) {
      renderHomeJobs(window.allJobs);
    }
  } catch (err) {
    console.error("Failed to load data:", err);
  }
}

// ==========================================
// 1. JOBS.HTML LOGIC
// ==========================================

function updateJobCount() {
  const countSpan = document.getElementById("job-count");
  if (countSpan)
    countSpan.innerText = `${window.filteredJobs.length} Jobs Found`;
}

window.renderJobs = function () {
  const container = document.getElementById("all-jobs-container");
  if (!container) return;

  const startIndex = (window.currentPage - 1) * jobsPerPage;
  const endIndex = startIndex + jobsPerPage;
  const jobsToShow = window.filteredJobs.slice(startIndex, endIndex);

  container.innerHTML = "";

  if (jobsToShow.length === 0) {
    container.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#888;padding: 3rem 0;">No jobs found matching your search.</p>`;
  } else {
    jobsToShow.forEach((job) => appendJobCard(container, job, true));
  }

  window.buildPaginationControls();
};

window.buildPaginationControls = function () {
  const pageDiv = document.querySelector(".pagination");
  if (!pageDiv) return;

  pageDiv.innerHTML = "";

  const totalPages = Math.ceil(window.filteredJobs.length / jobsPerPage);
  if (totalPages <= 1) return;

  const createButton = (text, isIcon, isDisabled, isActive, pageTarget) => {
    const btn = document.createElement("button");
    btn.className = "page-btn";
    if (isDisabled) btn.classList.add("disabled");
    if (isActive) btn.classList.add("active");

    btn.innerHTML = isIcon ? `<i class="fas fa-chevron-${text}"></i>` : text;

    if (!isDisabled && !isActive) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        window.currentPage = pageTarget;
        window.renderJobs();
        const feedHeader = document.querySelector(".feed-header");
        if (feedHeader) feedHeader.scrollIntoView({ behavior: "smooth" });
      });
    }
    return btn;
  };

  pageDiv.appendChild(
    createButton(
      "left",
      true,
      window.currentPage === 1,
      false,
      window.currentPage - 1,
    ),
  );
  for (let i = 1; i <= totalPages; i++) {
    pageDiv.appendChild(
      createButton(i, false, false, i === window.currentPage, i),
    );
  }
  pageDiv.appendChild(
    createButton(
      "right",
      true,
      window.currentPage === totalPages,
      false,
      window.currentPage + 1,
    ),
  );
};

// --- FILTERS ---
window.applyFilters = function () {
  const keyword =
    document.getElementById("keyword-filter")?.value.toLowerCase() || "";
  const location =
    document.getElementById("location-filter")?.value.toLowerCase() || "";
  const minSalaryInput = document.getElementById("salary-range");
  const minSalary = minSalaryInput ? parseInt(minSalaryInput.value) * 1000 : 0;
  const sortValue = document.getElementById("sort-jobs")?.value || "newest";
  const checkedTypes = Array.from(
    document.querySelectorAll(".checkbox-group input:checked"),
  ).map((cb) => cb.value.toLowerCase());

  window.filteredJobs = window.allJobs.filter((job) => {
    // Now checks Title, Company, AND Requirements for the keyword!
    const matchKeyword =
      (job.title && job.title.toLowerCase().includes(keyword)) ||
      (job.company && job.company.toLowerCase().includes(keyword)) ||
      (job.requirements && job.requirements.toLowerCase().includes(keyword));

    const matchLocation =
      job.location && job.location.toLowerCase().includes(location);

    let matchType = true;
    if (checkedTypes.length > 0) {
      matchType = checkedTypes.some((t) => {
        if (t === "remote") return job.isRemote;
        return job.type && job.type.toLowerCase().includes(t);
      });
    }

    let matchSalary = true;
    const safeSalaryNum = extractSalaryNumber(job);
    if (minSalary > 0) matchSalary = safeSalaryNum >= minSalary;

    return matchKeyword && matchLocation && matchType && matchSalary;
  });

  if (sortValue === "salary") {
    window.filteredJobs.sort(
      (a, b) => extractSalaryNumber(b) - extractSalaryNumber(a),
    );
  } else {
    window.filteredJobs.sort((a, b) => b.id - a.id);
  }

  window.currentPage = 1;
  updateJobCount();
  window.renderJobs();
};

window.resetFilters = function () {
  if (document.getElementById("keyword-filter"))
    document.getElementById("keyword-filter").value = "";
  if (document.getElementById("location-filter"))
    document.getElementById("location-filter").value = "";
  if (document.getElementById("job-search"))
    document.getElementById("job-search").value = "";
  if (document.getElementById("location-search"))
    document.getElementById("location-search").value = "";
  if (document.getElementById("salary-range"))
    document.getElementById("salary-range").value = 0;
  updateSalaryLabel(0);
  document
    .querySelectorAll(".checkbox-group input")
    .forEach((cb) => (cb.checked = false));
  if (document.getElementById("sort-jobs"))
    document.getElementById("sort-jobs").value = "newest";

  // Clear URL parameters
  window.history.pushState({}, document.title, window.location.pathname);

  window.applyFilters();
};

window.updateSalaryLabel = function (val) {
  if (document.getElementById("salary-val"))
    document.getElementById("salary-val").textContent = val;
};

window.searchJobs = function () {
  const keyword = document.getElementById("job-search")?.value || "";
  const location = document.getElementById("location-search")?.value || "";

  if (window.location.pathname.includes("jobs.html")) {
    // If already on jobs.html, sync the sidebar and apply instantly without reloading
    if (document.getElementById("keyword-filter"))
      document.getElementById("keyword-filter").value = keyword;
    if (document.getElementById("location-filter"))
      document.getElementById("location-filter").value = location;
    window.applyFilters();
  } else {
    // If on homepage, redirect to jobs page
    window.location.href = `jobs.html?keyword=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}`;
  }
};

window.smartTagSearch = function (tag) {
  const searchInput = document.getElementById("job-search");
  const filterInput = document.getElementById("keyword-filter");

  // Reset filters first
  window.resetFilters();

  // Map synonyms
  let query = tag.toLowerCase();
  if (query === "customer support" || query === "call center")
    query = "customer service";
  if (query === "wfh") query = "remote";

  // Set the inputs
  if (searchInput) searchInput.value = query;
  if (filterInput) filterInput.value = query;

  // Run the filter
  window.applyFilters();
};

// ==========================================
// 2. INDEX.HTML LOGIC
// ==========================================

function renderHomeJobs(data) {
  const container = document.getElementById("jobs-container");
  if (!container) return;
  container.innerHTML = "";
  if (data.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No jobs found in this category.</p>`;
    return;
  }
  data.slice(0, 6).forEach((job) => appendJobCard(container, job, false));
}

window.filterHomeTabs = function (element, category) {
  const options = document.querySelectorAll(".view-options span");
  options.forEach((opt) => opt.classList.remove("active"));
  element.classList.add("active");

  let filteredForHome = window.allJobs;
  if (category === "full time") {
    filteredForHome = window.allJobs.filter(
      (job) => job.type && job.type.toLowerCase().includes("full"),
    );
  } else if (category === "remote") {
    filteredForHome = window.allJobs.filter((job) => job.isRemote);
  }
  renderHomeJobs(filteredForHome);
};

// ==========================================
// 3. COMPANIES.HTML LOGIC
// ==========================================

function processCompanies(data) {
  const companyMap = {};
  data.forEach((job) => {
    if (!job.company) return;
    if (!companyMap[job.company]) {
      companyMap[job.company] = {
        name: job.company,
        logo: job.logo,
        openJobs: 0,
      };
    }
    companyMap[job.company].openJobs++;
  });
  companies = Object.values(companyMap);
}

function renderCompanies(data) {
  const container = document.getElementById("companies-container");
  if (!container) return;
  container.innerHTML = "";
  data.forEach((comp) => {
    const card = document.createElement("div");
    card.classList.add("company-card");
    card.innerHTML = `
            <div class="company-logo-large">${comp.logo || "DW"}</div>
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

window.renderCompanyProfile = function (companyName, allJobsArray) {
  const companyJobs = allJobsArray.filter((j) => j.company === companyName);
  const headerContainer = document.getElementById("company-profile-header");
  const jobsContainer = document.getElementById("company-jobs-container");

  if (!headerContainer || !jobsContainer) return;

  if (companyJobs.length === 0) {
    headerContainer.innerHTML = `<h2 style="text-align:center; color:white;">Company Not Found</h2>`;
    return;
  }

  const companyInfo = {
    name: companyName,
    logo: companyJobs[0].logo || "DW",
    count: companyJobs.length,
  };

  headerContainer.innerHTML = `
        <div class="company-logo-large" style="margin: 0 auto 1rem auto; display:flex;">${companyInfo.logo}</div>
        <h1 style="text-align:center; color:white; margin-bottom:0.5rem; font-size: 2.5rem;">${companyInfo.name}</h1>
        <div style="display:flex; justify-content:center; gap:1rem; margin-top:1rem;">
            <span class="open-jobs-tag" style="margin:0; background:var(--bg-input); color:var(--text-main); border:1px solid var(--border-color);">Technology & BPO</span>
            <span class="open-jobs-tag" style="margin:0;">${companyInfo.count} Active Positions</span>
        </div>
    `;

  jobsContainer.innerHTML = "";
  companyJobs.forEach((job) => appendJobCard(jobsContainer, job, true));
};

// ==========================================
// 4. SALARIES.HTML LOGIC
// ==========================================

function extractSalaryNumber(job) {
    if (!job.salary) return 0;
    
    // 1. CLEAN THE STRING
    let text = job.salary.toLowerCase().replace(/,/g, '');
    
    // SMART FILTER: Remove percentages and timeframes so they don't get confused as salaries!
    text = text.replace(/\d+%/g, ''); // Removes "10%", "15%"
    text = text.replace(/\d+\s*(months?|years?|days?)/g, ''); // Removes "6 months", "1 year"
    
    // 2. IDENTIFY CURRENCY & TIMEFRAME
    let isUSD = text.includes('usd') || text.includes('$');
    let isGBP = text.includes('gbp') || text.includes('£');
    let isHourly = text.includes('/hr') || text.includes('per hour') || text.includes('an hour');
    
    // 3. EXTRACT ALL NUMBERS (Now supports decimals like 24.5k)
    let regex = /((?:\d+\.)?\d+)\s*(k)?/g;
    let matches = [...text.matchAll(regex)];
    let parsedNumbers = [];
    
    for (let match of matches) {
        let num = parseFloat(match[1]);
        let hasK = match[2] !== undefined; // Detects if 'k' was attached
        
        // If it has a 'k' (e.g. 45k) or is a small number (e.g. 15), assume it means thousands.
        // BUT don't multiply if it's hourly/USD, and don't multiply if they typed a typo like "18500k".
        if ((hasK || (num >= 3 && num <= 200)) && !isHourly && !isUSD && !isGBP) {
            if (num < 1000) { 
                num = num * 1000; 
            }
        }
        
        // Convert Hourly to Monthly (Assuming 160 hours/month)
        let monthlyNum = num;
        if (isHourly) monthlyNum = num * 160;
        
        // Convert Foreign Currency to EGP (Adjust rates as needed)
        if (isUSD) monthlyNum *= 50;
        if (isGBP) monthlyNum *= 63;
        
        // Final Failsafe: Only accept it if the final EGP value is realistic
        if (monthlyNum >= 3000 && monthlyNum <= 200000) {
            parsedNumbers.push(monthlyNum);
        }
    }
    
    if (parsedNumbers.length === 0) return 0;

    // 4. DETERMINE THE FINAL VALUE
    // If they used "-" or "to", it's a range. We average it. (e.g., "$250 - $400" or "45-60k")
    if (text.includes('-') || text.includes(' to ')) {
        if (parsedNumbers.length >= 2) {
            return Math.round((parsedNumbers[0] + parsedNumbers[1]) / 2);
        }
    }
    
    // If it's a format like "10k / 12k", average it.
    if (text.includes('/') && !isHourly) {
        if (parsedNumbers.length >= 2) {
            return Math.round((parsedNumbers[0] + parsedNumbers[1]) / 2);
        }
    }
    
    // DEFAULT: For things like "12k + 1k KPIs" or "15k Net", just take the very first base number!
    return Math.round(parsedNumbers[0]);
}

function processSalaries(data) {
  const roleMap = {};
  data.forEach((job) => {
    if (!job.title) return;

    // Group similar roles (e.g. "Telesales - USA" merges cleanly into "Telesales")
    let title = job.title.split("(")[0].split("-")[0].trim();
    if (!roleMap[title]) roleMap[title] = { title: title, total: 0, count: 0 };

    let parsedSalary = extractSalaryNumber(job);

    // SMART FIX: ONLY count jobs that actually state a numerical cash salary!
    if (parsedSalary > 0) {
      roleMap[title].total += parsedSalary;
      roleMap[title].count++;
    }
  });

  // Filter out any roles that have 0 valid numerical salaries
  salaryStats = Object.values(roleMap)
    .filter((r) => r.count > 0)
    .map((r) => ({
      title: r.title,
      avg: Math.round(r.total / r.count),
      samples: r.count,
    }))
    .sort((a, b) => b.avg - a.avg);
}

function renderSalaries(data) {
  const container = document.getElementById("salaries-container");
  if (!container) return;
  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding: 3rem 0;">No numerical salary data found matching your search.</p>`;
    return;
  }

  const maxVal = Math.max(...data.map((d) => d.avg)) || 20000;

  data.forEach((stat) => {
    let width = (stat.avg / maxVal) * 100;
    if (width > 100) width = 100;
    if (width < 10) width = 10;

    const card = document.createElement("div");
    card.classList.add("salary-card");
    card.innerHTML = `
            <div class="salary-info">
                <h3>${stat.title}</h3>
                <p style="color:var(--text-muted); font-size:0.9rem;">Based on ${stat.samples} verified offers</p>
            </div>
            <div class="salary-visual">
                <div class="salary-bar-bg">
                    <div class="salary-bar-fill" style="width: ${width}%;">
                        <div class="salary-marker"></div>
                    </div>
                </div>
                <div class="salary-value">${stat.avg.toLocaleString()} EGP</div>
            </div>
        `;
    container.appendChild(card);
  });
}

window.filterSalaries = function () {
  const query =
    document.getElementById("salary-search")?.value.toLowerCase() || "";
  const filtered = salaryStats.filter((s) =>
    s.title.toLowerCase().includes(query),
  );
  renderSalaries(filtered);
};

// ==========================================
// 5. HELPER FUNCTIONS & UI
// ==========================================

function appendJobCard(container, job, isWide) {
  const card = document.createElement("div");
  const saveJobCode = `event.stopPropagation(); saveJob(${job.id}, '${job.title.replace(/'/g, "\\'")}', '${job.company.replace(/'/g, "\\'")}', '${job.logo}')`;

  if (isWide) {
    card.classList.add("job-card-wide");
    card.innerHTML = `
            <div class="logo-box">${job.logo || "DW"}</div>
            <div class="job-info">
                <h3>${job.title}</h3>
                <div class="company">${job.company}</div>
                <div class="meta">
                    <span class="tag"><i class="fas fa-map-marker-alt"></i> ${job.location || "Remote"}</span>
                    <span class="tag"><i class="fas fa-money-bill-wave"></i> ${job.salary || "Competitive"}</span>
                </div>
            </div>
            <div class="actions">
                <div class="action-row">
                    <button class="btn-save" onclick="${saveJobCode}" title="Save Job"><i class="far fa-bookmark"></i></button>
                    <button class="btn-primary" onclick="openJobDetails(${job.id})">View Details</button>
                </div>
            </div>
        `;
  } else {
    card.classList.add("job-card");
    card.innerHTML = `
            <div class="job-card-header">
                <div class="company-logo">${job.logo || "DW"}</div>
                <div class="header-text">
                    <h3 class="job-title">${job.title}</h3>
                    <p class="company-name">${job.company}</p>
                </div>
            </div>
            <span class="job-type">${job.type || "Full Time"}</span>
            <div class="job-details">
                <span><i class="fas fa-map-marker-alt"></i> ${job.location || "Remote"}</span>
                <span><i class="fas fa-money-bill-wave"></i> ${job.salary || "Competitive"}</span>
            </div>
            <button class="apply-btn" onclick="openJobDetails(${job.id})">View Details</button>
        `;
  }
  container.appendChild(card);
}

window.openJobDetails = function (jobId) {
  const job = window.allJobs.find((j) => j.id === jobId);
  if (!job) return;
  if (document.getElementById("modal-title"))
    document.getElementById("modal-title").textContent = job.title;
  if (document.getElementById("modal-company"))
    document.getElementById("modal-company").textContent = job.company;
  if (document.getElementById("modal-salary"))
    document.getElementById("modal-salary").textContent =
      job.salary || "Competitive";
  if (document.getElementById("modal-location"))
    document.getElementById("modal-location").textContent =
      job.location || "Remote";
  if (document.getElementById("modal-hours"))
    document.getElementById("modal-hours").textContent =
      job.hours || "Standard";
  if (document.getElementById("modal-logo"))
    document.getElementById("modal-logo").textContent = job.logo || "DW";

  const reqContainer = document.getElementById("modal-requirements");
  if (reqContainer) {
    if (job.requirements) {
      reqContainer.innerHTML = `<p class="text-block">${job.requirements}</p>`;
    } else {
      reqContainer.innerHTML =
        "<p class='text-muted'>No specific requirements listed.</p>";
    }
  }
  if (document.getElementById("modal-description"))
    document.getElementById("modal-description").textContent =
      job.description || "No description provided.";
  if (document.getElementById("modal-training"))
    document.getElementById("modal-training").textContent =
      job.training || "Not specified.";
  if (document.getElementById("job-modal"))
    document.getElementById("job-modal").classList.add("open");
};

window.closeJobModal = function () {
  const modal = document.getElementById("job-modal");
  if (modal) modal.classList.remove("open");
};

window.addEventListener("click", (e) => {
  if (e.target === document.getElementById("job-modal")) closeJobModal();
});

window.applyForJob = function () {
  const title = document.getElementById("modal-title").textContent;
  const company = document.getElementById("modal-company").textContent;
  const job = window.allJobs.find(
    (j) => j.title === title && j.company === company,
  );

  const id = job ? job.id : 0;
  const isBilingual = job && job.bilingual ? "1" : "0"; // Check if it's bilingual

  window.location.href = `apply.html?id=${id}&title=${encodeURIComponent(title)}&company=${encodeURIComponent(company)}&bilingual=${isBilingual}`;
};

window.saveJob = function (id, title, company, logo) {
  const saved = JSON.parse(localStorage.getItem("my_saved_jobs")) || [];
  if (saved.some((j) => j.id === id)) {
    alert("Job already saved!");
    return;
  }
  saved.push({ id, title, company, logo });
  localStorage.setItem("my_saved_jobs", JSON.stringify(saved));
  alert("Job Saved to Dashboard!");
};

// --- AUTH & NAVBAR ---
document.addEventListener("DOMContentLoaded", () => {
  const userStr = localStorage.getItem("user");
  const authButtons = document.querySelector(".auth-buttons");
  if (authButtons && userStr) {
    const user = JSON.parse(userStr);
    const displayName = user.fullName || user.name || "User";
    authButtons.innerHTML = `
            <a href="dashboard.html" class="btn-text"><i class="fas fa-user-circle"></i> ${user.name.split(" ")[0]}</a>
            <a onclick="globalLogout()" class="btn-primary" style="cursor:pointer; color: black;">Logout</a>
        `;
  } else if (authButtons) {
    authButtons.innerHTML = `
            <a href="login.html" class="btn-text">Log In</a>
            <a href="login.html" class="btn-primary" style="color: black;">Sign Up</a>
        `;
  }

  const menuToggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector(".nav-links");
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      if (navLinks) navLinks.classList.toggle("show-menu");
      if (authButtons) authButtons.classList.toggle("show-menu");
    });
  }
});

window.globalLogout = function () {
  localStorage.removeItem("user");
  window.location.href = "index.html";
};
