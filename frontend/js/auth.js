const API_URL = "https://voxa-pi-three.vercel.app/api";

// Toggle between Login and Signup views
function toggleAuth() {
  const loginBox = document.getElementById("login-box");
  const signupBox = document.getElementById("signup-box");

  // Clear messages
  document
    .querySelectorAll(".error-msg")
    .forEach((el) => (el.style.display = "none"));
  document
    .querySelectorAll(".success-msg")
    .forEach((el) => (el.style.display = "none"));

  if (loginBox.classList.contains("hidden")) {
    loginBox.classList.remove("hidden");
    signupBox.classList.add("hidden");
  } else {
    loginBox.classList.add("hidden");
    signupBox.classList.remove("hidden");
  }
}

// Handle Sign Up
const signupForm = document.getElementById("signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fullName = document.getElementById("signup-name").value;
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;

    const termsChecked = document.getElementById("legal-checkbox").checked;
    
    const errorMsg = document.getElementById("signup-error");
    const successMsg = document.getElementById("signup-success");

    if (!termsChecked) {
      errorMsg.textContent =
        "You must agree to the Terms of Service and Privacy Policy.";
      errorMsg.style.display = "block";
      successMsg.style.display = "none";
      return; // Stop the signup process immediately
    }

    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        successMsg.textContent =
          "Account created successfully! Switching to login...";
        successMsg.style.display = "block";
        errorMsg.style.display = "none";
        setTimeout(() => {
          toggleAuth();
        }, 1500);
      } else {
        throw new Error(data.error || "Signup failed");
      }
    } catch (err) {
      errorMsg.textContent =
        err.message || "Connection failed. Is the backend running?";
      errorMsg.style.display = "block";
      successMsg.style.display = "none";
    }
  });
}

// Handle Login
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    const errorMsg = document.getElementById("login-error");

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // FIXED: Replaced 'result' with 'data.user'
        localStorage.setItem(
          "user",
          JSON.stringify({
            name: data.user.name,
            email: data.user.email,
            role: data.user.role,
            team: data.user.team, // This is their Agency Name
            isAdmin: data.user.isAdmin, // Preserves your admin checks
          }),
        );

        // SMART ROUTING BASED ON ROLE
        const userRole = data.user.role;
        
        if (userRole === "SuperAdmin" || userRole === "Admin") {
          window.location.href = "admin.html";
        } else if (["CEO", "UnitManager", "Leader", "Recruiter"].includes(userRole)) {
          // 🚀 Send corporate staff to the new Shapeshifter Workspace!
          window.location.href = "agency-dashboard.html";
        } else if (userRole === "Validator") {
          window.location.href = "validator.html";
        } else {
          // Regular candidates go to the candidate portal
          window.location.href = "dashboard.html";
        }
      } else {
        throw new Error(data.error || "Login failed");
      }
    } catch (err) {
      errorMsg.textContent =
        err.message || "Connection failed. Is the backend running?";
      errorMsg.style.display = "block";
    }
  });
}
