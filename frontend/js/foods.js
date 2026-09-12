/**
 * FoodRescue Lite - Food Discovery & Details Logic
 */

let selectedFoodForClaim = null;

// Default fallback images by category for clean presentation
const categoryPlaceholders = {
  'Meals': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
  'Bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
  'Fruits': 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&auto=format&fit=crop&q=80',
  'Snacks': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80',
  'Beverages': 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=600&auto=format&fit=crop&q=80',
  'Vegetables': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
  'Other': 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&auto=format&fit=crop&q=80'
};

function getFoodImage(food) {
  if (food.image_url && food.image_url.trim().startsWith('http')) {
    return food.image_url.trim();
  }
  return categoryPlaceholders[food.category] || categoryPlaceholders['Other'];
}

// Load food items into catalog (foods.html)
async function loadFoods() {
  const container = document.getElementById('foods-container');
  if (!container) return;

  const search = document.getElementById('search-input')?.value || '';
  const category = document.getElementById('category-filter')?.value || '';
  const vegFilter = document.getElementById('veg-filter')?.value || '';
  const statusFilter = document.getElementById('status-filter')?.value || 'AVAILABLE';

  container.innerHTML = `
    <div class="loading-spinner" style="grid-column: 1 / -1;">
      <div class="spinner"></div>
      <p>Discovering surplus food near you...</p>
    </div>
  `;

  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (vegFilter) params.append('is_vegetarian', vegFilter);
    if (statusFilter) params.append('status', statusFilter);

    const res = await apiRequest(`/foods?${params.toString()}`);
    const foods = res.data;

    if (!foods || foods.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 12h8"></path>
          </svg>
          <h3>No surplus food available right now</h3>
          <p>Try adjusting your search criteria or check back later when local food providers post new surplus batches.</p>
          <button onclick="resetFilters()" class="btn btn-secondary">Reset Filters</button>
        </div>
      `;
      return;
    }

    const currentUser = getCurrentUser();
    const isRecipient = currentUser && currentUser.role === 'RECIPIENT';

    container.innerHTML = foods.map(food => {
      const remaining = getTimeRemaining(food.available_until);
      const isClaimable = food.status === 'AVAILABLE' && !remaining.expired;
      const statusBadgeClass = `badge badge-${food.status.toLowerCase()}`;

      return `
        <div class="card food-card">
          <div class="food-card-image">
            <img src="${getFoodImage(food)}" alt="${food.food_name}" onerror="this.src='${categoryPlaceholders['Other']}'">
            <div class="food-card-badge">
              <span class="${statusBadgeClass}">${food.status}</span>
            </div>
          </div>
          <div class="food-card-body">
            <h3 class="food-card-title">${food.food_name}</h3>
            <div class="food-card-meta">
              <span class="tag-category">${food.category}</span>
              ${food.is_vegetarian ? 
                '<span class="tag-veg">🌱 Vegetarian</span>' : 
                '<span class="tag-nonveg">🍗 Non-Veg</span>'}
            </div>

            <div class="food-card-qty">${food.quantity} ${food.unit}</div>

            <ul class="food-card-details">
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span>${food.pickup_location}</span>
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>Available until <strong>${formatDateTime(food.available_until)}</strong> (${remaining.text})</span>
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Provider: ${food.provider_name}</span>
              </li>
            </ul>

            <div class="food-card-footer">
              <a href="/food-details.html?id=${food.id}" class="btn btn-secondary btn-sm">View Details</a>
              ${isClaimable ? `
                <button onclick="openClaimModal(${food.id}, '${encodeURIComponent(food.food_name)}', '${encodeURIComponent(food.pickup_location)}', '${food.available_until}')" class="btn btn-primary btn-sm">
                  Claim Food
                </button>
              ` : (food.status === 'AVAILABLE' ? `
                <button disabled class="btn btn-secondary btn-sm">Expired</button>
              ` : `
                <button disabled class="btn btn-secondary btn-sm">${food.status}</button>
              `)}
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <h3>Could not load food listings</h3>
        <p>${err.message}</p>
        <button onclick="loadFoods()" class="btn btn-primary">Try Again</button>
      </div>
    `;
  }
}

function resetFilters() {
  const searchInput = document.getElementById('search-input');
  const catFilter = document.getElementById('category-filter');
  const vegFilter = document.getElementById('veg-filter');
  const statusFilter = document.getElementById('status-filter');

  if (searchInput) searchInput.value = '';
  if (catFilter) catFilter.value = '';
  if (vegFilter) vegFilter.value = '';
  if (statusFilter) statusFilter.value = 'AVAILABLE';
  loadFoods();
}

// Open Claim Confirmation Modal
function openClaimModal(foodId, name, location, deadline) {
  const user = getCurrentUser();
  if (!user) {
    showToast('Please log in as a Recipient to claim food.', 'warning');
    setTimeout(() => {
      window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
    }, 1200);
    return;
  }

  if (user.role !== 'RECIPIENT') {
    showToast('Only Recipient / Volunteer accounts can claim surplus food.', 'warning');
    return;
  }

  selectedFoodForClaim = {
    id: foodId,
    name: decodeURIComponent(name),
    location: decodeURIComponent(location),
    deadline: deadline
  };

  const modal = document.getElementById('claim-modal');
  const modalDesc = document.getElementById('modal-food-desc');
  if (modal && modalDesc) {
    modalDesc.innerHTML = `
      <div style="background: var(--bg-main); padding: 1rem; border-radius: var(--radius-md); margin: 1rem 0; border: 1px solid var(--border-color);">
        <h4 style="color: var(--primary); font-size: 1.1rem; margin-bottom: 0.35rem;">${selectedFoodForClaim.name}</h4>
        <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.25rem;">📍 <strong>Location:</strong> ${selectedFoodForClaim.location}</p>
        <p style="font-size: 0.9rem; color: var(--text-muted);">⏰ <strong>Pickup Deadline:</strong> ${formatDateTime(selectedFoodForClaim.deadline)}</p>
      </div>
      <p style="font-size: 0.88rem; color: var(--text-muted);">
        By claiming, you confirm that you will arrive at the pickup location before the deadline to collect this surplus food.
      </p>
    `;
    modal.classList.add('show');
  }
}

function closeClaimModal() {
  const modal = document.getElementById('claim-modal');
  if (modal) modal.classList.remove('show');
  selectedFoodForClaim = null;
}

// Execute Claim API Call
async function confirmClaim() {
  if (!selectedFoodForClaim) return;
  const btn = document.getElementById('confirm-claim-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Claiming...';
  }

  try {
    const res = await apiRequest(`/foods/${selectedFoodForClaim.id}/claim`, {
      method: 'POST'
    });

    closeClaimModal();
    showToast(res.message || 'Food claimed successfully!');

    // If on details page or discovery page, reload or redirect to claims
    setTimeout(() => {
      window.location.href = '/recipient-dashboard.html';
    }, 1000);
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerText = 'Confirm Claim';
    }
  }
}

// Single Food Details Page Logic (food-details.html)
async function loadFoodDetails() {
  const detailsContainer = document.getElementById('food-details-container');
  if (!detailsContainer) return;

  const urlParams = new URLSearchParams(window.location.search);
  const foodId = urlParams.get('id');

  if (!foodId) {
    detailsContainer.innerHTML = `
      <div class="empty-state">
        <h3>Food Item Not Specified</h3>
        <p>No food post ID was provided in the URL.</p>
        <a href="/foods.html" class="btn btn-primary">Browse Available Food</a>
      </div>
    `;
    return;
  }

  try {
    const res = await apiRequest(`/foods/${foodId}`);
    const food = res.data;
    const remaining = getTimeRemaining(food.available_until);
    const currentUser = getCurrentUser();
    const isRecipient = currentUser && currentUser.role === 'RECIPIENT';
    const isClaimable = food.status === 'AVAILABLE' && !remaining.expired;

    detailsContainer.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 2.5rem; background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 2rem; box-shadow: var(--shadow-sm);" class="details-layout">
        <div>
          <div style="border-radius: var(--radius-md); overflow: hidden; height: 320px; background: #e2e8f0; margin-bottom: 1.25rem;">
            <img src="${getFoodImage(food)}" alt="${food.food_name}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
          <div style="background: var(--primary-light); border: 1px solid var(--primary-border); border-radius: var(--radius-md); padding: 1.25rem;">
            <h4 style="color: var(--primary-hover); font-size: 0.95rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">
              🛡️ Food Safety & Consumption Notice
            </h4>
            <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">
              Only claim food that is safe and suitable for consumption. Providers are responsible for providing accurate food and availability information. Please inspect items upon collection.
            </p>
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.75rem;">
            <h1 style="font-size: 2rem; font-weight: 800; color: var(--text-main); line-height: 1.2;">${food.food_name}</h1>
            <span class="badge badge-${food.status.toLowerCase()}">${food.status}</span>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; flex-wrap: wrap;">
            <span class="tag-category">${food.category}</span>
            ${food.is_vegetarian ? 
              '<span class="tag-veg">🌱 Vegetarian</span>' : 
              '<span class="tag-nonveg">🍗 Non-Vegetarian</span>'}
            <span style="font-size: 0.85rem; color: var(--text-muted);">Posted on ${formatDateTime(food.created_at)}</span>
          </div>

          <div style="font-size: 1.5rem; font-weight: 800; color: var(--primary); margin-bottom: 1.25rem;">
            ${food.quantity} ${food.unit}
          </div>

          <div style="margin-bottom: 1.5rem;">
            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.4rem; color: var(--text-main);">Description</h3>
            <p style="color: var(--text-muted); line-height: 1.6; font-size: 0.95rem;">
              ${food.description || 'No detailed description provided by the food provider.'}
            </p>
          </div>

          <div style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.75rem;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div>
                <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Pickup Location</span>
                <p style="font-weight: 600; font-size: 0.95rem; margin-top: 2px;">📍 ${food.pickup_location}</p>
              </div>
              <div>
                <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Available Until</span>
                <p style="font-weight: 600; font-size: 0.95rem; margin-top: 2px; color: ${remaining.expired ? 'var(--accent-red)' : 'inherit'};">
                  ⏰ ${formatDateTime(food.available_until)} (${remaining.text})
                </p>
              </div>
              <div>
                <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Food Provider</span>
                <p style="font-weight: 600; font-size: 0.95rem; margin-top: 2px;">🏢 ${food.provider_name}</p>
              </div>
              <div>
                <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Prepared At</span>
                <p style="font-weight: 600; font-size: 0.95rem; margin-top: 2px;">🍳 ${food.preparation_time ? formatDateTime(food.preparation_time) : 'Fresh batch'}</p>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
            ${isClaimable ? `
              <button onclick="openClaimModal(${food.id}, '${encodeURIComponent(food.food_name)}', '${encodeURIComponent(food.pickup_location)}', '${food.available_until}')" class="btn btn-primary btn-lg" style="flex: 2;">
                Claim This Surplus Food
              </button>
            ` : `
              <button disabled class="btn btn-secondary btn-lg" style="flex: 2;">
                ${food.status === 'AVAILABLE' ? 'Offer Expired' : `Food is ${food.status}`}
              </button>
            `}
            <a href="/foods.html" class="btn btn-secondary btn-lg" style="flex: 1;">Back to Catalog</a>
          </div>
        </div>
      </div>
    `;

  } catch (err) {
    detailsContainer.innerHTML = `
      <div class="empty-state">
        <h3>Error Loading Food Details</h3>
        <p>${err.message}</p>
        <a href="/foods.html" class="btn btn-primary">Back to Catalog</a>
      </div>
    `;
  }
}
