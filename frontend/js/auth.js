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
        // 🚀 NEW: Save all the matrix variables so the dashboard can read them!
        localStorage.setItem(
          "user",
          JSON.stringify({
            fullName: data.user.fullName,
            email: data.user.email,
            role: data.user.role,
            agencyName: data.user.agencyName || "Voxa",
            unitName: data.user.unitName || "Direct",
            teamName: data.user.teamName || "Direct",
            isAdmin: data.user.isAdmin,
          }),
        );

        // SMART ROUTING BASED ON ROLE
        // 1. Split the user's role string into an array (e.g., ["UnitManager", "Validator"])
        const userRoles = (data.user.role || "")
          .split(",")
          .map((r) => r.trim());

        // 2. Route based on the highest-priority role they hold
        if (userRoles.includes("SuperAdmin") || userRoles.includes("Admin")) {
          window.location.href = "admin.html";
        } else if (userRoles.includes("HR")) {
          window.location.href = "hr-dashboard.html";
        } else if (
          userRoles.includes("CEO") ||
          userRoles.includes("UnitManager") ||
          userRoles.includes("Leader") ||
          userRoles.includes("Recruiter")
        ) {
          window.location.href = "agency-dashboard.html";
        } else if (userRoles.includes("Validator")) {
          window.location.href = "validator.html";
        } else {
          // Standard candidates fall here
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
