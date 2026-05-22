window.AUTH_API_URL = window.AUTH_API_URL || 'https://voxa-pi-three.vercel.app/api';
const AUTH_API_URL = window.AUTH_API_URL;

let currentEmail = ''
let verifyMode = 'signup' // 'signup' or 'reset'
let currentVerifiedCode = '' // Store code for password reset

// Toggle between Login and Signup views
function toggleAuth() {
  const loginBox = document.getElementById('login-box')
  const signupBox = document.getElementById('signup-box')

  // Clear messages
  document
    .querySelectorAll('.error-msg')
    .forEach((el) => (el.style.display = 'none'))
  document
    .querySelectorAll('.success-msg')
    .forEach((el) => (el.style.display = 'none'))

  if (loginBox.classList.contains('hidden')) {
    loginBox.classList.remove('hidden')
    signupBox.classList.add('hidden')
  } else {
    loginBox.classList.add('hidden')
    signupBox.classList.remove('hidden')
  }
}

// Handle Sign Up
const signupForm = document.getElementById('signup-form')
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const fullName = document.getElementById('signup-name').value
    const email = document.getElementById('signup-email').value
    const password = document.getElementById('signup-password').value
    const confirmPassword = document.getElementById(
      'signup-password-confirm'
    ).value

    const termsChecked = document.getElementById('legal-checkbox').checked

    const errorMsg = document.getElementById('signup-error')
    const successMsg = document.getElementById('signup-success')

    if (password !== confirmPassword) {
      errorMsg.textContent = 'Passwords do not match.'
      errorMsg.style.display = 'block'
      successMsg.style.display = 'none'
      return
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    if (!passwordRegex.test(password)) {
      errorMsg.textContent =
        'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, and a number.'
      errorMsg.style.display = 'block'
      successMsg.style.display = 'none'
      return
    }

    if (!termsChecked) {
      errorMsg.textContent =
        'You must agree to the Terms of Service and Privacy Policy.'
      errorMsg.style.display = 'block'
      successMsg.style.display = 'none'
      return // Stop the signup process immediately
    }

    try {
      const response = await fetch(`${AUTH_API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        successMsg.textContent =
          'Account created! Check your email for the verification code.'
        successMsg.style.display = 'block'
        errorMsg.style.display = 'none'
        currentEmail = email
        verifyMode = 'signup'
        setTimeout(() => {
          if (typeof showVerifyStep === 'function') showVerifyStep()
        }, 1500)
      } else {
        throw new Error(data.error || 'Signup failed')
      }
    } catch (err) {
      errorMsg.textContent =
        err.message || 'Connection failed. Is the backend running?'
      errorMsg.style.display = 'block'
      successMsg.style.display = 'none'
    }
  })
}

// Handle Forgot Password
const forgotForm = document.getElementById('forgot-form')
if (forgotForm) {
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('forgot-email').value
    const btn = e.target.querySelector('button')
    const originalText = btn.innerHTML

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...'
    btn.disabled = true

    try {
      const response = await fetch(`${AUTH_API_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        alert('Recovery code sent to your email!')
        currentEmail = email
        verifyMode = 'reset'
        if (typeof showVerifyStep === 'function') showVerifyStep()
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send recovery email')
      }
    } catch (err) {
      alert(err.message)
    } finally {
      btn.innerHTML = originalText
      btn.disabled = false
    }
  })
}

// Handle Verification (for both Signup and Password Reset)
const verifyForm = document.getElementById('verify-form')
if (verifyForm) {
  verifyForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const code = document.getElementById('verify-code').value
    const btn = e.target.querySelector('button')
    const originalText = btn.innerHTML

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...'
    btn.disabled = true

    try {
      const endpoint =
        verifyMode === 'signup' ? '/verify-email' : '/verify-code-only'
      const payload = { email: currentEmail, code: code }

      const response = await fetch(`${AUTH_API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        if (verifyMode === 'signup') {
          alert(data.message)
          if (typeof showLogin === 'function') showLogin()
        } else {
          currentVerifiedCode = code // Save it to reset the password next
          if (typeof showResetPassword === 'function') showResetPassword()
        }
      } else {
        throw new Error(data.error || 'Verification failed')
      }
    } catch (err) {
      alert(err.message)
    } finally {
      btn.innerHTML = originalText
      btn.disabled = false
    }
  })
}

// Handle Creating New Password
const resetPasswordForm = document.getElementById('reset-password-form')
if (resetPasswordForm) {
  resetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const password = document.getElementById('reset-new-password').value
    const confirmPassword = document.getElementById(
      'reset-new-password-confirm'
    ).value
    const errorMsg = document.getElementById('reset-error')
    const btn = e.target.querySelector('button')

    if (password !== confirmPassword) {
      errorMsg.textContent = 'Passwords do not match.'
      errorMsg.style.display = 'block'
      return
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    if (!passwordRegex.test(password)) {
      errorMsg.textContent =
        'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, and a number.'
      errorMsg.style.display = 'block'
      return
    }

    const originalText = btn.innerHTML
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'
    btn.disabled = true

    try {
      const response = await fetch(`${AUTH_API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentEmail,
          code: currentVerifiedCode,
          password: password,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        alert(data.message)
        if (typeof showLogin === 'function') showLogin()
      } else throw new Error(data.error || 'Reset failed')
    } catch (err) {
      errorMsg.textContent = err.message
      errorMsg.style.display = 'block'
    } finally {
      btn.innerHTML = originalText
      btn.disabled = false
    }
  })
}

// Handle Login
const loginForm = document.getElementById('login-form')
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('login-email').value
    const password = document.getElementById('login-password').value
    const errorMsg = document.getElementById('login-error')

    try {
      const response = await fetch(`${AUTH_API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        // 🚀 NEW: Save all the matrix variables so the dashboard can read them!
        localStorage.setItem(
          'user',
          JSON.stringify({
            fullName: data.user.fullName,
            email: data.user.email,
            role: data.user.role,
            agencyName: data.user.agencyName || 'Voxa',
            unitName: data.user.unitName || 'Direct',
            teamName: data.user.teamName || 'Direct',
            validatorScopes: data.user.validatorScopes || '',
            isAdmin: data.user.isAdmin,
          })
        )

        // SMART ROUTING BASED ON ROLE
        // 1. Split the user's role string into an array (e.g., ["UnitManager", "Validator"])
        const userRoles = (data.user.role || '')
          .split(',')
          .map((r) => r.trim())
          .filter((r) => r && r !== 'Candidate')

        // 2. Route based on the highest-priority role they hold
        if (userRoles.length === 1 && userRoles[0] === 'Validator') {
          window.location.href = 'validator.html'
        } else if (
          userRoles.includes('SuperAdmin') ||
          userRoles.includes('Admin')
        ) {
          window.location.href = 'admin.html'
        } else if (userRoles.includes('HR')) {
          window.location.href = 'hr-dashboard.html'
        } else if (
          userRoles.includes('CEO') ||
          userRoles.includes('UnitManager') ||
          userRoles.includes('Leader') ||
          userRoles.includes('Recruiter')
        ) {
          window.location.href = 'agency-dashboard.html'
        } else if (userRoles.includes('Validator')) {
          window.location.href = 'validator.html'
        } else {
          // Standard candidates fall here
          window.location.href = 'dashboard.html'
        }
      } else {
        if (data.unverified) {
          currentEmail = email
          verifyMode = 'signup'
          if (typeof showVerifyStep === 'function') showVerifyStep()
          errorMsg.textContent =
            'Please enter your verification code to continue.'
          errorMsg.style.display = 'block'
          return // Stop normal execution and leave them on the verify screen
        }
        throw new Error(data.error || 'Login failed')
      }
    } catch (err) {
      errorMsg.textContent =
        err.message || 'Connection failed. Is the backend running?'
      errorMsg.style.display = 'block'
    }
  })
}

// --- GOOGLE OAUTH HANDLING ---
document.addEventListener('DOMContentLoaded', async () => {
  // Check if Google just redirected us back with an ID Token
  const hash = window.location.hash
  if (hash && hash.includes('id_token=')) {
    const params = new URLSearchParams(hash.substring(1))
    const idToken = params.get('id_token')
    if (idToken) {
      try {
        // Decode the JWT Payload (Base64)
        const payload = JSON.parse(atob(idToken.split('.')[1]))

        const response = await fetch(`${AUTH_API_URL}/oauth-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: payload.email,
            fullName: payload.name || payload.email.split('@')[0],
          }),
        })
        const data = await response.json()
        if (response.ok) {
          localStorage.setItem('user', JSON.stringify(data.user))
          window.location.href = data.user.isAdmin
            ? 'admin.html'
            : 'dashboard.html'
        }
      } catch (err) {
        console.error('OAuth Error:', err)
      }
    }
    window.location.hash = '' // Clean up URL
  }
})

// This is attached directly to the login.html "Continue with Google" buttons
window.loginWithGoogle = function () {
  const clientId =
    '168561650845-m8epv6ppegqq3crqv87lvpsfofk80s1s.apps.googleusercontent.com'
  const redirectUri = window.location.origin + '/login.html'
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token id_token&scope=email profile&nonce=12345`
  window.location.href = url
}
