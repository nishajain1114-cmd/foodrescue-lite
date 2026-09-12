/**
 * FoodRescue Lite - Provider Dashboard & Food Posting Logic
 */

// Load Provider Statistics & Posts
async function loadProviderDashboard() {
  if (!checkRoleGuard(['PROVIDER', 'ADMIN'])) return;

  loadProviderStats();
  loadProviderFoods();
}

async function loadProviderStats() {
  const statsContainer = document.getElementById('provider-stats');
  if (!statsContainer) return;

  try {
    const res = await apiRequest('/provider/stats');
    const s = res.data;

    statsContainer.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <div class="stat-info">
          <h4>Active Posts</h4>
          <div class="stat-value">${s.active_posts}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon amber">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <div class="stat-info">
          <h4>Claimed Posts</h4>
          <div class="stat-value">${s.claimed_posts}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="stat-info">
          <h4>Collected Posts</h4>
          <div class="stat-value">${s.collected_posts}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon red">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </div>
        <div class="stat-info">
          <h4>Expired Posts</h4>
          <div class="stat-value">${s.expired_posts}</div>
        </div>
      </div>
    `;
  } catch (err) {
    showToast('Failed to load stats: ' + err.message, 'error');
  }
}

async function loadProviderFoods() {
  const tableBody = document.getElementById('provider-foods-tbody');
  if (!tableBody) return;

  try {
    const res = await apiRequest('/provider/foods');
    const foods = res.data;

    if (!foods || foods.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 3rem 1rem;">
            <div class="empty-state" style="border: none; margin: 0; padding: 0;">
              <h3>Your surplus food posts will appear here</h3>
              <p>You haven't posted any surplus food yet. Share surplus food to prevent wastage!</p>
              <a href="/create-food.html" class="btn btn-primary" style="margin-top: 1rem;">+ Post Surplus Food</a>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = foods.map(food => {
      const isClaimed = food.status === 'CLAIMED';
      const isAvailable = food.status === 'AVAILABLE';

      let claimInfo = '-';
      if (food.claimant_name) {
        claimInfo = `
          <div>
            <strong>${food.claimant_name}</strong>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${food.claimant_email}</div>
          </div>
        `;
      }

      let actions = `
        <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
          <a href="/food-details.html?id=${food.id}" class="btn btn-secondary btn-sm" title="View details">View</a>
      `;

      if (isAvailable) {
        actions += `
          <a href="/create-food.html?id=${food.id}" class="btn btn-secondary btn-sm">Edit</a>
          <button onclick="deleteFoodPost(${food.id})" class="btn btn-danger btn-sm">Delete</button>
        `;
      }

      if (isClaimed && food.claim_id) {
        actions += `
          <button onclick="markPostCollected(${food.claim_id}, '${encodeURIComponent(food.food_name)}')" class="btn btn-primary btn-sm">
            Mark as Collected
          </button>
        `;
      }

      actions += '</div>';

      return `
        <tr>
          <td>
            <strong>${food.food_name}</strong>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${food.category} • ${food.is_vegetarian ? '🌱 Veg' : '🍗 Non-Veg'}</div>
          </td>
          <td><strong>${food.quantity}</strong> ${food.unit}</td>
          <td>${food.pickup_location}</td>
          <td>${formatDateTime(food.available_until)}</td>
          <td>
            <span class="badge badge-${food.status.toLowerCase()}">${food.status}</span>
            ${claimInfo !== '-' ? `<div style="margin-top: 4px;">${claimInfo}</div>` : ''}
          </td>
          <td>${actions}</td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    tableBody.innerHTML = `
      <tr><td colspan="6" style="text-align: center; color: var(--accent-red); padding: 2rem;">Error: ${err.message}</td></tr>
    `;
  }
}

// Mark food handover as collected
async function markPostCollected(claimId, foodName) {
  const cleanName = decodeURIComponent(foodName);
  if (!confirm(`Confirm handover for "${cleanName}"? This will mark the food as COLLECTED.`)) {
    return;
  }

  try {
    const res = await apiRequest(`/claims/${claimId}/collect`, {
      method: 'PATCH'
    });

    showToast(res.message || 'Food marked as collected successfully!');
    loadProviderStats();
    loadProviderFoods();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Delete post
async function deleteFoodPost(foodId) {
  if (!confirm('Are you sure you want to delete this surplus food post?')) {
    return;
  }

  try {
    const res = await apiRequest(`/foods/${foodId}`, {
      method: 'DELETE'
    });

    showToast(res.message || 'Food post removed.');
    loadProviderStats();
    loadProviderFoods();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Food Creation / Editing Form Logic (create-food.html)
async function initFoodForm() {
  if (!checkRoleGuard(['PROVIDER', 'ADMIN'])) return;

  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('id');

  const formTitle = document.getElementById('form-title');
  const submitBtn = document.getElementById('submit-btn');

  // Pre-fill default available_until to 4 hours from now
  const defaultDeadline = new Date(Date.now() + 4 * 3600 * 1000);
  const offset = defaultDeadline.getTimezoneOffset() * 60000;
  const localIso = (new Date(defaultDeadline - offset)).toISOString().slice(0, 16);
  const deadlineInput = document.getElementById('available_until');
  if (deadlineInput && !editId) {
    deadlineInput.value = localIso;
  }

  if (editId) {
    if (formTitle) formTitle.innerText = 'Edit Surplus Food Post';
    if (submitBtn) submitBtn.innerText = 'Update Food Post';

    try {
      const res = await apiRequest(`/foods/${editId}`);
      const food = res.data;

      document.getElementById('food_name').value = food.food_name || '';
      document.getElementById('category').value = food.category || 'Meals';
      document.getElementById('quantity').value = food.quantity || 1;
      document.getElementById('unit').value = food.unit || 'portions';
      document.getElementById('pickup_location').value = food.pickup_location || '';
      document.getElementById('description').value = food.description || '';
      document.getElementById('image_url').value = food.image_url || '';
      document.getElementById('is_vegetarian').checked = Boolean(food.is_vegetarian);

      if (food.available_until) {
        const d = new Date(food.available_until);
        const dLocal = (new Date(d - offset)).toISOString().slice(0, 16);
        document.getElementById('available_until').value = dLocal;
      }
    } catch (err) {
      showToast('Error loading food details: ' + err.message, 'error');
    }
  }

  const form = document.getElementById('food-post-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('submit-btn');
      btn.disabled = true;
      btn.innerText = 'Saving...';

      const payload = {
        food_name: document.getElementById('food_name').value.trim(),
        category: document.getElementById('category').value,
        quantity: parseInt(document.getElementById('quantity').value, 10),
        unit: document.getElementById('unit').value.trim() || 'portions',
        pickup_location: document.getElementById('pickup_location').value.trim(),
        available_until: document.getElementById('available_until').value,
        description: document.getElementById('description').value.trim(),
        image_url: document.getElementById('image_url').value.trim() || null,
        is_vegetarian: document.getElementById('is_vegetarian').checked
      };

      try {
        let res;
        if (editId) {
          res = await apiRequest(`/foods/${editId}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          });
          showToast(res.message || 'Food post updated successfully!');
        } else {
          res = await apiRequest('/foods', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          showToast(res.message || 'Your surplus food has been posted successfully.');
        }

        setTimeout(() => {
          window.location.href = '/provider-dashboard.html';
        }, 1000);
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.innerText = editId ? 'Update Food Post' : 'Post Surplus Food';
      }
    });
  }
}
