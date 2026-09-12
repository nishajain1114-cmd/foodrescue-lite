/**
 * FoodRescue Lite - Minimal Admin Dashboard Logic
 */

async function loadAdminDashboard() {
  if (!checkRoleGuard(['ADMIN'])) return;

  loadAdminStats();
  loadAdminUsers();
  loadAdminFoods();
  loadAdminClaims();
}

async function loadAdminStats() {
  const container = document.getElementById('admin-stats');
  if (!container) return;

  try {
    const res = await apiRequest('/admin/stats');
    const s = res.data;

    container.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <div class="stat-info">
          <h4>Total Users</h4>
          <div class="stat-value">${s.total_users}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${s.total_providers} Providers • ${s.total_recipients} Recipients</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon amber">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div class="stat-info">
          <h4>Total Food Posts</h4>
          <div class="stat-value">${s.total_food_posts}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">Platform listings</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 14 14"></polyline>
          </svg>
        </div>
        <div class="stat-info">
          <h4>Total Claims</h4>
          <div class="stat-value">${s.total_claims}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">Food reservations</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="stat-info">
          <h4>Collected / Rescued</h4>
          <div class="stat-value">${s.collected_posts}</div>
          <div style="font-size: 0.78rem; color: var(--primary-hover); font-weight: 600;">${s.total_rescued_portions} portions rescued</div>
        </div>
      </div>
    `;
  } catch (err) {
    showToast('Failed to load admin stats: ' + err.message, 'error');
  }
}

async function loadAdminUsers() {
  const tbody = document.getElementById('admin-users-tbody');
  if (!tbody) return;

  try {
    const res = await apiRequest('/admin/users');
    tbody.innerHTML = res.data.map(u => `
      <tr>
        <td><strong>#${u.id}</strong></td>
        <td><strong>${u.full_name}</strong></td>
        <td>${u.email}</td>
        <td><span class="tag-category">${u.role}</span></td>
        <td>${u.role === 'PROVIDER' ? `${u.posts_count} posts` : `${u.claims_count} claims`}</td>
        <td>${formatDateTime(u.created_at)}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6">Error loading users: ${err.message}</td></tr>`;
  }
}

async function loadAdminFoods() {
  const tbody = document.getElementById('admin-foods-tbody');
  if (!tbody) return;

  try {
    const res = await apiRequest('/admin/foods');
    tbody.innerHTML = res.data.map(f => `
      <tr>
        <td><strong>#${f.id}</strong></td>
        <td>
          <strong>${f.food_name}</strong>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${f.category} • ${f.quantity} ${f.unit}</div>
        </td>
        <td>${f.provider_name}</td>
        <td><span class="badge badge-${f.status.toLowerCase()}">${f.status}</span></td>
        <td>${formatDateTime(f.available_until)}</td>
        <td>
          <button onclick="adminDeleteFood(${f.id})" class="btn btn-danger btn-sm" title="Remove inappropriate post">
            Remove
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6">Error loading food posts: ${err.message}</td></tr>`;
  }
}

async function loadAdminClaims() {
  const tbody = document.getElementById('admin-claims-tbody');
  if (!tbody) return;

  try {
    const res = await apiRequest('/admin/claims');
    if (res.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No claims made yet.</td></tr>';
      return;
    }
    tbody.innerHTML = res.data.map(c => `
      <tr>
        <td><strong>#${c.id}</strong></td>
        <td>${c.food_name} (${c.quantity} ${c.unit})</td>
        <td>${c.provider_name}</td>
        <td>${c.recipient_name}</td>
        <td><span class="badge badge-${c.status.toLowerCase()}">${c.status}</span></td>
        <td>${formatDateTime(c.claimed_at)}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6">Error loading claims: ${err.message}</td></tr>`;
  }
}

async function adminDeleteFood(foodId) {
  if (!confirm(`Admin action: Are you sure you want to remove food post #${foodId}?`)) return;

  try {
    const res = await apiRequest(`/admin/foods/${foodId}`, { method: 'DELETE' });
    showToast(res.message || 'Food post removed.');
    loadAdminStats();
    loadAdminFoods();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
