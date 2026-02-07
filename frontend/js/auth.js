const API_URL = "http://127.0.0.1:5000/api";

// Toggle between Login and Signup views
function toggleAuth() {
    const loginBox = document.getElementById('login-box');
    const signupBox = document.getElementById('signup-box');
    
    // Clear messages
    document.querySelectorAll('.error-msg').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.success-msg').forEach(el => el.style.display = 'none');

    if (loginBox.classList.contains('hidden')) {
        loginBox.classList.remove('hidden');
        signupBox.classList.add('hidden');
    } else {
        loginBox.classList.add('hidden');
        signupBox.classList.remove('hidden');
    }
}

// Handle Sign Up
document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const errorMsg = document.getElementById('signup-error');
    const successMsg = document.getElementById('signup-success');

    try {
        const response = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            successMsg.textContent = "Account created successfully! Switching to login...";
            successMsg.style.display = 'block';
            errorMsg.style.display = 'none';
            setTimeout(() => {
                toggleAuth(); // Switch to login view
            }, 1500);
        } else {
            throw new Error(data.error || "Signup failed");
        }
    } catch (err) {
        errorMsg.textContent = err.message;
        errorMsg.style.display = 'block';
        successMsg.style.display = 'none';
    }
});

// Handle Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorMsg = document.getElementById('login-error');

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Save user info to LocalStorage
            localStorage.setItem('user', JSON.stringify(data.user));
            alert(`Welcome back, ${data.user.name}!`);
            window.location.href = 'index.html'; // Redirect to home
        } else {
            throw new Error(data.error || "Login failed");
        }
    } catch (err) {
        errorMsg.textContent = err.message;
        errorMsg.style.display = 'block';
    }
});