/**
 * FoodRescue Lite - Centralized API Client
 */

const API_BASE = '/api';

// Toast Notification System
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'error' ? '⚠️' : (type === 'warning' ? '⏳' : '✅');
  toast.innerHTML = `
    <span>${icon}</span>
    <div style="flex: 1">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// HTTP request helper with token injection
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => ({
      success: false,
      message: 'Failed to parse server response.'
    }));

    if (!res.ok) {
      if (res.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
        // Session expired
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html?expired=true';
      }
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }

    return data;
  } catch (err) {
    throw err;
  }
}

// Utility: Format Date & Time cleanly
function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// Utility: Calculate remaining time / status
function getTimeRemaining(deadlineStr) {
  const deadline = new Date(deadlineStr);
  const now = new Date();
  const diffMs = deadline - now;

  if (diffMs <= 0) return { expired: true, text: 'Expired' };

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 24) {
    const days = Math.floor(diffHours / 24);
    return { expired: false, text: `${days} day${days > 1 ? 's' : ''} left` };
  } else if (diffHours > 0) {
    return { expired: false, text: `${diffHours}h ${diffMins}m left` };
  } else {
    return { expired: false, text: `${diffMins} min left` };
  }
}
