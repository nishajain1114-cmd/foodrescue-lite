/**
 * FoodRescue Lite - Authentication State & Dynamic Navigation
 */

function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

function isAuthenticated() {
  return !!localStorage.getItem('token') && !!getCurrentUser();
}

function checkRoleGuard(allowedRoles) {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
    return false;
  }
  if (!allowedRoles.includes(user.role)) {
    alert(`Access denied. This page is intended for ${allowedRoles.join(' or ')} accounts.`);
    window.location.href = '/';
    return false;
  }
  return true;
}

function logoutUser() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showToast('Logged out successfully.');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 500);
}

// Render dynamic navbar based on user role and auth status
function renderNavbar() {
  const navPlaceholder = document.getElementById('navbar-container');
  if (!navPlaceholder) return;

  const user = getCurrentUser();
  const currentPath = window.location.pathname;

  let roleLinks = '';
  let authActions = '';

  if (user) {
    if (user.role === 'PROVIDER') {
      roleLinks = `
        <li><a href="/create-food.html" class="nav-link ${currentPath.includes('create-food') ? 'active' : ''}">+ Post Surplus Food</a></li>
        <li><a href="/provider-dashboard.html" class="nav-link ${currentPath.includes('provider-dashboard') ? 'active' : ''}">Provider Dashboard</a></li>
      `;
    } else if (user.role === 'RECIPIENT') {
      roleLinks = `
        <li><a href="/foods.html" class="nav-link ${currentPath.includes('foods') && !currentPath.includes('create') ? 'active' : ''}">Find Food</a></li>
        <li><a href="/recipient-dashboard.html" class="nav-link ${currentPath.includes('recipient-dashboard') ? 'active' : ''}">My Claims</a></li>
      `;
    } else if (user.role === 'ADMIN') {
      roleLinks = `
        <li><a href="/foods.html" class="nav-link">Browse Food</a></li>
        <li><a href="/admin-dashboard.html" class="nav-link ${currentPath.includes('admin-dashboard') ? 'active' : ''}">Admin Panel</a></li>
      `;
    }

    authActions = `
      <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
        <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">
          ${user.full_name} <span class="tag-category" style="font-size: 0.75rem; margin-left: 4px;">${user.role}</span>
        </span>
        <button onclick="logoutUser()" class="btn btn-secondary btn-sm">Logout</button>
      </div>
    `;
  } else {
    roleLinks = `
      <li><a href="/foods.html" class="nav-link ${currentPath.includes('foods') ? 'active' : ''}">Find Food</a></li>
      <li><a href="/login.html" class="nav-link">Share Food</a></li>
    `;

    authActions = `
      <a href="/login.html" class="btn btn-secondary btn-sm">Log In</a>
      <a href="/register.html" class="btn btn-primary btn-sm">Register</a>
    `;
  }

  navPlaceholder.innerHTML = `
    <header class="site-header">
      <div class="container nav-wrapper">
        <a href="/" class="brand-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          <span>FoodRescue <span class="brand-tag">Lite</span></span>
        </a>

        <button class="mobile-nav-toggle" id="mobile-toggle" aria-label="Toggle navigation menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        <ul class="nav-menu" id="nav-menu">
          <li><a href="/" class="nav-link ${currentPath === '/' || currentPath.endsWith('index.html') ? 'active' : ''}">Home</a></li>
          ${roleLinks}
          <li class="nav-actions">${authActions}</li>
        </ul>
      </div>
    </header>
  `;

  // Mobile menu toggle logic
  const toggleBtn = document.getElementById('mobile-toggle');
  const menu = document.getElementById('nav-menu');
  if (toggleBtn && menu) {
    toggleBtn.addEventListener('click', () => {
      menu.classList.toggle('open');
    });
  }
}

document.addEventListener('DOMContentLoaded', renderNavbar);
