// ═══════════════════════════════════════════════
// NEXUS PRIME OMEGA — Auth Page JavaScript
// ═══════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  const API_URL = 'https://nexus-prime-omega.onrender.com';

  // ── Elements ────────────────────────────────
  const tabSignIn = document.getElementById('tabSignIn');
  const tabSignUp = document.getElementById('tabSignUp');
  const tabIndicator = document.getElementById('tabIndicator');
  const signinForm = document.getElementById('signinForm');
  const signupForm = document.getElementById('signupForm');
  const authMessage = document.getElementById('authMessage');

  // ── Already logged in? Redirect ─────────────
  if (localStorage.getItem('nexus_token')) {
    window.location.href = '/agent';
    return;
  }

  // ── Tab Switching ───────────────────────────
  const switchTab = (tab) => {
    authMessage.className = 'auth-message';
    authMessage.style.display = 'none';
    if (tab === 'signin') {
      tabSignIn.classList.add('active');
      tabSignUp.classList.remove('active');
      signinForm.classList.add('active');
      signupForm.classList.remove('active');
      tabIndicator.classList.remove('right');
    } else {
      tabSignUp.classList.add('active');
      tabSignIn.classList.remove('active');
      signupForm.classList.add('active');
      signinForm.classList.remove('active');
      tabIndicator.classList.add('right');
    }
  };

  tabSignIn.addEventListener('click', () => switchTab('signin'));
  tabSignUp.addEventListener('click', () => switchTab('signup'));

  // Check URL hash for direct signup link
  if (window.location.hash === '#signup') {
    switchTab('signup');
  }

  // ── Show Message ────────────────────────────
  const showMessage = (text, type = 'error') => {
    authMessage.textContent = text;
    authMessage.className = `auth-message ${type}`;
  };

  // ── Toggle Password ─────────────────────────
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  });

  // ── Password Strength ───────────────────────
  const signupPassword = document.getElementById('signupPassword');
  const strengthBar = document.getElementById('strengthBar');

  if (signupPassword) {
    signupPassword.addEventListener('input', () => {
      const val = signupPassword.value;
      let strength = 0;
      if (val.length >= 6) strength++;
      if (val.length >= 10) strength++;
      if (/[A-Z]/.test(val) && /[a-z]/.test(val)) strength++;
      if (/\d/.test(val)) strength++;
      if (/[^a-zA-Z0-9]/.test(val)) strength++;

      strengthBar.className = 'strength-bar';
      if (strength <= 1) strengthBar.classList.add('weak');
      else if (strength === 2) strengthBar.classList.add('fair');
      else if (strength === 3) strengthBar.classList.add('good');
      else strengthBar.classList.add('strong');
    });
  }

  // ── Real-time Validation ────────────────────
  const validateField = (input, errorEl, validator) => {
    input.addEventListener('blur', () => {
      const error = validator(input.value);
      const errSpan = document.getElementById(errorEl);
      if (error) {
        input.classList.add('invalid');
        input.classList.remove('valid');
        if (errSpan) errSpan.textContent = error;
      } else {
        input.classList.remove('invalid');
        input.classList.add('valid');
        if (errSpan) errSpan.textContent = '';
      }
    });
  };

  validateField(document.getElementById('fullName'), 'fullNameError',
    v => v.trim().length < 2 ? 'Name must be at least 2 characters' : '');
  validateField(document.getElementById('username'), 'usernameError',
    v => !/^[a-zA-Z0-9]{3,30}$/.test(v) ? '3-30 alphanumeric characters only' : '');
  validateField(document.getElementById('signupEmail'), 'emailError',
    v => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Enter a valid email address' : '');
  validateField(document.getElementById('signupPassword'), 'passwordError',
    v => v.length < 6 ? 'Password must be at least 6 characters' : '');

  const confirmPass = document.getElementById('confirmPassword');
  if (confirmPass) {
    confirmPass.addEventListener('blur', () => {
      const errSpan = document.getElementById('confirmError');
      if (confirmPass.value !== signupPassword.value) {
        confirmPass.classList.add('invalid');
        confirmPass.classList.remove('valid');
        if (errSpan) errSpan.textContent = 'Passwords do not match';
      } else {
        confirmPass.classList.remove('invalid');
        confirmPass.classList.add('valid');
        if (errSpan) errSpan.textContent = '';
      }
    });
  }

  // ── Sign In ─────────────────────────────────
  signinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('signinBtn');
    btn.classList.add('loading');
    btn.disabled = true;

    const login = document.getElementById('loginInput').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password })
      });
      const data = await res.json();

      if (!res.ok) {
        showMessage(data.message || 'Login failed', 'error');
        return;
      }

      localStorage.setItem('nexus_token', data.token);
      localStorage.setItem('nexus_refresh', data.refreshToken);
      localStorage.setItem('nexus_user', JSON.stringify(data.user));

      showMessage('Login successful! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = '/agent';
      }, 500);
    } catch (err) {
      showMessage('Network error. Please try again.', 'error');
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  });

  // ── Sign Up ─────────────────────────────────
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('signupBtn');

    const fullName = document.getElementById('fullName').value.trim();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = signupPassword.value;
    const confirm = confirmPass.value;

    if (password !== confirm) {
      showMessage('Passwords do not match', 'error');
      return;
    }

    btn.classList.add('loading');
    btn.disabled = true;

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, username, email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        showMessage(data.message || 'Registration failed', 'error');
        return;
      }

      localStorage.setItem('nexus_token', data.token);
      localStorage.setItem('nexus_refresh', data.refreshToken);
      localStorage.setItem('nexus_user', JSON.stringify(data.user));

      showMessage('Account created! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = '/agent';
      }, 500);
    } catch (err) {
      showMessage('Network error. Please try again.', 'error');
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  });

  // ── Minimal Particle Effect ─────────────────
  const canvas = document.getElementById('particleCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });

    const particles = Array.from({ length: 30 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1.2 + 0.3,
      speedX: (Math.random() - 0.5) * 0.2,
      speedY: (Math.random() - 0.5) * 0.2,
      opacity: Math.random() * 0.4 + 0.1
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
        if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 255, ${p.opacity})`;
        ctx.fill();
      });
      requestAnimationFrame(animate);
    };
    animate();
  }

  // ── Forgot Password Logic ───────────────────
  const forgotPwdLink = document.getElementById('forgotPwdLink');
  const backToLogin = document.getElementById('backToLogin');
  const forgotForm = document.getElementById('forgotForm');
  const forgotBtn = document.getElementById('forgotBtn');
  const forgotLoader = document.getElementById('forgotLoader');

  forgotPwdLink?.addEventListener('click', () => {
    signinForm.classList.remove('active');
    signupForm.classList.remove('active');
    forgotForm.classList.add('active');
    tabSignIn.style.pointerEvents = 'none';
    tabSignUp.style.pointerEvents = 'none';
    tabIndicator.style.opacity = '0';
    authMessage.style.display = 'none';
  });

  backToLogin?.addEventListener('click', () => {
    forgotForm.classList.remove('active');
    signinForm.classList.add('active');
    tabSignIn.style.pointerEvents = 'auto';
    tabSignUp.style.pointerEvents = 'auto';
    tabIndicator.style.opacity = '0.15';
    authMessage.style.display = 'none';
  });

  forgotForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value.trim();
    
    forgotBtn.disabled = true;
    forgotBtn.classList.add('loading');
    
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (res.ok) {
        showMessage('Reset link sent to your email!', 'success');
        forgotForm.reset();
      } else {
        showMessage(data.message || 'Error sending link', 'error');
      }
    } catch (err) {
      showMessage('Network error. Try again.', 'error');
    } finally {
      forgotBtn.disabled = false;
      forgotBtn.classList.remove('loading');
    }
  });
});
