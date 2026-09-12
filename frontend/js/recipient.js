/**
 * FoodRescue Lite - Recipient Dashboard (My Claims) Logic
 */

async function loadRecipientClaims() {
  if (!checkRoleGuard(['RECIPIENT', 'ADMIN'])) return;

  const claimsContainer = document.getElementById('recipient-claims-container');
  if (!claimsContainer) return;

  claimsContainer.innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
      <p>Loading your claimed food posts...</p>
    </div>
  `;

  try {
    const res = await apiRequest('/claims/my');
    const claims = res.data;

    if (!claims || claims.length === 0) {
      claimsContainer.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          <h3>You haven't claimed any food yet</h3>
          <p>Browse available surplus food posted by local canteens, hostels, and cafes to rescue meals before they expire.</p>
          <a href="/foods.html" class="btn btn-primary" style="margin-top: 1rem;">Find Surplus Food</a>
        </div>
      `;
      return;
    }

    claimsContainer.innerHTML = `
      <div class="food-grid">
        ${claims.map(claim => {
          const remaining = getTimeRemaining(claim.available_until);
          const statusBadge = `badge badge-${claim.claim_status.toLowerCase()}`;

          return `
            <div class="card food-card">
              <div class="food-card-body">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                  <h3 class="food-card-title">${claim.food_name}</h3>
                  <span class="${statusBadge}">${claim.claim_status}</span>
                </div>

                <div class="food-card-qty">${claim.quantity} ${claim.unit}</div>

                <div class="food-card-meta">
                  <span class="tag-category">${claim.category}</span>
                  ${claim.is_vegetarian ? 
                    '<span class="tag-veg">🌱 Veg</span>' : 
                    '<span class="tag-nonveg">🍗 Non-Veg</span>'}
                </div>

                <ul class="food-card-details">
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span><strong>Location:</strong> ${claim.pickup_location}</span>
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span><strong>Pickup Deadline:</strong> ${formatDateTime(claim.available_until)} (${remaining.text})</span>
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span><strong>Provider:</strong> ${claim.provider_name} (${claim.provider_email})</span>
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Claimed on ${formatDateTime(claim.claimed_at)}</span>
                  </li>
                  ${claim.collected_at ? `
                    <li style="color: var(--accent-blue); font-weight: 600;">
                      <span>✅ Collected on ${formatDateTime(claim.collected_at)}</span>
                    </li>
                  ` : ''}
                </ul>

                <div class="food-card-footer">
                  <a href="/food-details.html?id=${claim.food_post_id}" class="btn btn-secondary btn-sm btn-block">View Food Details</a>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

  } catch (err) {
    claimsContainer.innerHTML = `
      <div class="empty-state">
        <h3>Could not load your claims</h3>
        <p>${err.message}</p>
        <button onclick="loadRecipientClaims()" class="btn btn-primary">Try Again</button>
      </div>
    `;
  }
}
