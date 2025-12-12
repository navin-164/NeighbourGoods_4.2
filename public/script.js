document.addEventListener('DOMContentLoaded', () => {
  // Globals
  let token = null;
  let user = null;
  let authModal = null;
  let ratingModal = null;

  // --- Element Selectors ---
  const loggedOutView = document.getElementById('logged-out-view');
  const mainFeedView = document.getElementById('main-feed-view');
  const dashboardView = document.getElementById('dashboard-view');
  const allViews = [mainFeedView, dashboardView, loggedOutView];

  // Nav
  const navLogin = document.getElementById('nav-login');
  const navUser = document.getElementById('nav-user');
  const navLogout = document.getElementById('nav-logout');
  const welcomeMessage = document.getElementById('welcome-message');
  const logoutButton = document.getElementById('logout-button');
  const navMarketLink = document.getElementById('nav-market-link');
  const navDashboardLink = document.getElementById('nav-dashboard-link');
  const showMainFeedBtn = document.getElementById('show-main-feed-btn');
  const showDashboardBtn = document.getElementById('show-dashboard-btn');
  
  // Auth Modal
  const authModalEl = document.getElementById('authModal');
  if (authModalEl) authModal = new bootstrap.Modal(authModalEl);
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const showRegister = document.getElementById('show-register');
  const showLogin = document.getElementById('show-login');
  const authMessage = document.getElementById('auth-message');
  
  // Item Form
  const postItemForm = document.getElementById('post-item-form');
  const priceBorrowField = document.getElementById('price-borrow-field');
  const priceSaleField = document.getElementById('price-sale-field');
  
  // Item Display (Market)
  const itemsGrid = document.getElementById('items-grid');
  const itemsLoading = document.getElementById('items-loading');
  
  // Dashboard Sections
  const lenderItemsAvailable = document.querySelector('#lender-items-available .row');
  const lenderItemsBorrowed = document.querySelector('#lender-items-borrowed .row');
  const lenderItemsSold = document.querySelector('#lender-items-sold .row');
  const customerItemsBorrowed = document.querySelector('#customer-items-borrowed .row');
  const customerItemsPurchased = document.querySelector('#customer-items-purchased .row');
  const recommendationsGrid = document.getElementById('recommendations-grid');

  // Rating Modal
  const ratingModalEl = document.getElementById('ratingModal');
  if (ratingModalEl) ratingModal = new bootstrap.Modal(ratingModalEl);
  const ratingForm = document.getElementById('rating-form');
  const starRatingContainer = document.querySelector('.star-rating');
  const ratingStars = document.querySelectorAll('.star-rating .bi');
  const rateStarsInput = document.getElementById('rate-stars');
  const rateItemIdInput = document.getElementById('rate-item-id');
  const rateItemName = document.getElementById('rate-item-name');

  // --- Auth & UI State ---
  
  function restoreAuth() {
    token = localStorage.getItem('neighbourGoods_token');
    const userData = localStorage.getItem('neighbourGoods_user');
    if (token && userData) {
      user = JSON.parse(userData);
      updateUIAfterLogin();
    } else {
      updateUIAfterLogout();
    }
  }

  function setAuth(t, u) {
    token = t;
    user = u;
    localStorage.setItem('neighbourGoods_token', t);
    localStorage.setItem('neighbourGoods_user', JSON.stringify(u));
    updateUIAfterLogin();
  }

  function updateUIAfterLogin() {
    navLogin.classList.add('d-none');
    navUser.classList.remove('d-none');
    navLogout.classList.remove('d-none');
    navMarketLink.classList.remove('d-none');
    navDashboardLink.classList.remove('d-none');
    welcomeMessage.textContent = `Welcome, ${user.name}!`;
    showView(mainFeedView);
    loadItems();
  }

  function updateUIAfterLogout() {
    navLogin.classList.remove('d-none');
    navUser.classList.add('d-none');
    navLogout.classList.add('d-none');
    navMarketLink.classList.add('d-none');
    navDashboardLink.classList.add('d-none');
    welcomeMessage.textContent = '';
    showView(loggedOutView);
  }

  function showView(viewToShow) {
    allViews.forEach(view => view.classList.add('d-none'));
    viewToShow.classList.remove('d-none');
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active-nav'));
    if (viewToShow === mainFeedView) showMainFeedBtn.classList.add('active-nav');
    if (viewToShow === dashboardView) showDashboardBtn.classList.add('active-nav');
  }

  // --- Event Listeners ---

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
      const res = await apiFetch('/api/auth/login', 'POST', { email, password });
      setAuth(res.token, res.user);
      authModal.hide();
      loginForm.reset();
    } catch (err) {
      showAuthMessage(err.message, 'danger');
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    try {
      const res = await apiFetch('/api/auth/register', 'POST', { name, email, password });
      showAuthMessage(res.message, 'success');
      showLoginForm();
      registerForm.reset();
    } catch (err) {
      showAuthMessage(err.message, 'danger');
    }
  });

  logoutButton.addEventListener('click', (e) => {
    e.preventDefault();
    token = null;
    user = null;
    localStorage.removeItem('neighbourGoods_token');
    localStorage.removeItem('neighbourGoods_user');
    updateUIAfterLogout();
  });

  showMainFeedBtn.addEventListener('click', () => showView(mainFeedView));
  showDashboardBtn.addEventListener('click', () => {
    showView(dashboardView);
    loadDashboard();
  });

  showRegister.addEventListener('click', () => showRegisterForm());
  showLogin.addEventListener('click', () => showLoginForm());

  document.querySelectorAll('input[name="listingType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        priceBorrowField.classList.toggle('d-none', e.target.value !== 'borrow');
        priceSaleField.classList.toggle('d-none', e.target.value !== 'sale');
    });
  });

  postItemForm.addEventListener('submit', handlePostItem);

  // --- Main Logic Functions ---

  async function loadItems() {
    itemsLoading.style.display = 'block';
    itemsGrid.innerHTML = '';
    try {
      const items = await apiFetch('/api/items');
      itemsLoading.style.display = 'none';
      if (items.length === 0) {
        itemsGrid.innerHTML = '<p class="text-muted">No items are currently listed. Be the first!</p>';
      } else {
        items.forEach(item => {
            itemsGrid.innerHTML += createItemCard(item, 'market');
        });
      }
    } catch (err) {
      itemsLoading.style.display = 'none';
      itemsGrid.innerHTML = `<p class="text-danger">Failed to load items: ${err.message}</p>`;
    }
  }

  async function loadDashboard() {
    try {
        // Fetch all dashboard data concurrently
        const [lenderData, customerData, recs] = await Promise.all([
            apiFetch('/api/auth/dashboard/lender'),
            apiFetch('/api/auth/dashboard/customer'),
            apiFetch('/api/auth/dashboard/recommendations')
        ]);

        // Render lender sections
        renderDashboardList(lenderItemsAvailable, lenderData.available, 'lender');
        renderDashboardList(lenderItemsBorrowed, lenderData.borrowed, 'lender');
        renderDashboardList(lenderItemsSold, lenderData.sold, 'lender');

        // Render customer sections
        renderDashboardList(customerItemsBorrowed, customerData.borrowed, 'customer');
        renderDashboardList(customerItemsPurchased, customerData.purchased, 'customer');

        // Render recommendations
        renderDashboardList(recommendationsGrid, recs, 'market');
        if (recs.length === 0) {
             recommendationsGrid.innerHTML = '<p class="text-muted col-12">No recommendations right now. Borrow or buy items to get suggestions!</p>';
        }

    } catch (err) {
        lenderItemsAvailable.innerHTML = `<p class="text-danger">Failed to load dashboard: ${err.message}</p>`;
    }
  }

  async function handlePostItem(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', document.getElementById('item-name').value);
    formData.append('description', document.getElementById('item-desc').value);
    formData.append('category', document.getElementById('item-category').value);
    formData.append('listingType', document.querySelector('input[name="listingType"]:checked').value);
    formData.append('pricePerDay', document.getElementById('item-price-day').value || 0);
    formData.append('salePrice', document.getElementById('item-price-sale').value || 0);
    
    const imageFile = document.getElementById('item-image').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }
    
    try {
        await apiFetch('/api/items', 'POST', formData, true); // true for FormData
        alert('Item listed successfully!');
        postItemForm.reset();
        loadItems();
    } catch (err) {
        alert(`Error: ${err.message}`);
    }
  }
  
  // --- Global Functions for Buttons ---

  window.borrowItem = async (itemId) => {
    if (!confirm('Are you sure you want to borrow this item?')) return;
    try {
        await apiFetch(`/api/items/${itemId}/borrow`, 'PUT');
        alert('Item successfully borrowed!');
        loadItems();
    } catch (err) {
        alert(`Error: ${err.message}`);
    }
  }
  
  window.buyItem = async (itemId) => {
    if (!confirm('Are you sure you want to purchase this item?')) return;
    try {
        await apiFetch(`/api/items/${itemId}/buy`, 'POST');
        alert('Item successfully purchased!');
        loadItems();
    } catch (err) {
        alert(`Error: ${err.message}`);
    }
  }
  
  window.openRatingModal = (itemId, itemName) => {
      rateItemIdInput.value = itemId;
      rateItemName.textContent = itemName;
      rateStarsInput.value = 0;
      ratingStars.forEach(star => star.className = 'bi bi-star');
      document.getElementById('rate-comment').value = '';
      ratingModal.show();
  }

  // --- HTML Generation ---

  function createItemCard(item, context) {
      const isOwner = user && user.id === item.owner;
      
      let avgRatingHtml = '<span class="ms-2 text-muted" style="font-size: 0.9rem;">No ratings</span>';
      if (item.ratings && item.ratings.length > 0) {
          const avgRating = item.ratings.reduce((acc, r) => acc + r.stars, 0) / item.ratings.length;
          avgRatingHtml = `<span class="ms-2" style="color: #ffc107;">${'★'.repeat(Math.round(avgRating))}${'☆'.repeat(5 - Math.round(avgRating))}</span> 
                           <span class="ms-1">${avgRating.toFixed(1)} (${item.ratings.length})</span>`;
      }

      let price, typeBadge, button;
      if (item.listingType === 'borrow') {
          typeBadge = '<span class="badge bg-success">For Borrow</span>';
          price = `<span class="item-card-price-day">$${Number(item.pricePerDay).toFixed(2)} / day</span>`;
          button = `<button class="btn btn-sm btn-success" ${isOwner ? 'disabled' : ''} onclick="borrowItem('${item._id}')">Borrow</button>`;
      } else {
          typeBadge = '<span class="badge bg-primary">For Sale</span>';
          price = `<span class="item-card-price">$${Number(item.salePrice).toFixed(2)}</span>`;
          button = `<button class="btn btn-sm btn-primary" ${isOwner ? 'disabled' : ''} onclick="buyItem('${item._id}')">Buy</button>`;
      }
      
      let cardFooter;
      switch (context) {
          case 'market':
              cardFooter = `<div class="d-flex justify-content-between align-items-center">
                              <span class="card-footer-item">By: ${escapeHTML(item.ownerName)}</span>
                              ${item.status === 'Available' ? button : `<span class="badge bg-secondary">${item.status}</span>`}
                            </div>`;
              break;
          case 'customer':
              const hasRated = item.ratings.some(r => r.user === user.id);
              cardFooter = `<div class="d-flex justify-content-between align-items-center">
                              <span class="card-footer-item">From: ${escapeHTML(item.ownerName)}</span>
                              <button class="btn btn-sm btn-warning ${hasRated ? 'disabled' : ''}" onclick="openRatingModal('${item._id}', '${escapeHTML(item.name)}')">${hasRated ? 'Rated' : 'Rate'}</button>
                            </div>`;
              break;
          default: // lender
              cardFooter = `<span class="card-footer-item">Status: <strong>${item.status}</strong></span>`;
      }

      return `
        <div class="col-md-6 col-lg-4 mb-4">
          <div class="card shadow-sm item-card">
            <img src="${item.imageUrl || `https://placehold.co/600x400/eee/ccc?text=No+Image`}" class="card-img-top item-card-img" alt="${escapeHTML(item.name)}">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start">
                  <h5 class="card-title mb-1">${escapeHTML(item.name)}</h5>
                  ${typeBadge}
              </div>
              <h6 class="card-subtitle mb-2 text-muted">${escapeHTML(item.category)}</h6>
              <p class="card-text small">${escapeHTML(item.description)}</p>
              <div class="mb-2">${price}</div>
              <div class="d-flex align-items-center">${avgRatingHtml}</div>
            </div>
            <div class="card-footer bg-white border-top-0">${cardFooter}</div>
          </div>
        </div>`;
  }

  function renderDashboardList(element, items, type) {
    if (!items || items.length === 0) {
        element.innerHTML = `<p class="text-muted col-12">No items in this category.</p>`;
        return;
    }
    element.innerHTML = '';
    items.forEach(item => {
        element.innerHTML += createItemCard(item, type);
    });
  }

  // --- Utility & Helper Functions ---

  function showLoginForm() {
    loginForm.classList.remove('d-none'); registerForm.classList.add('d-none'); authMessage.innerHTML = '';
  }
  function showRegisterForm() {
    loginForm.classList.add('d-none'); registerForm.classList.remove('d-none'); authMessage.innerHTML = '';
  }
  function showAuthMessage(message, type = 'danger') {
    authMessage.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  }

  starRatingContainer.addEventListener('click', (e) => {
    if (e.target.matches('.bi')) {
        const value = e.target.dataset.value;
        rateStarsInput.value = value;
        ratingStars.forEach(star => {
            star.className = star.dataset.value <= value ? 'bi bi-star-fill' : 'bi bi-star';
        });
    }
  });

  ratingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const itemId = rateItemIdInput.value;
    const stars = rateStarsInput.value;
    if (stars === '0') return alert('Please select a star rating.');
    
    try {
        await apiFetch(`/api/items/${itemId}/rate`, 'POST', { 
            stars, 
            comment: document.getElementById('rate-comment').value 
        });
        alert('Rating submitted!');
        ratingModal.hide();
        loadDashboard();
    } catch (err) {
        alert(`Error: ${err.message}`);
    }
  });

  async function apiFetch(url, method = 'GET', body = null, isFormData = false) {
      const headers = {};
      if (token) {
          headers['Authorization'] = `Bearer ${token}`;
      }
      const options = { method, headers };
      if (body) {
          if (isFormData) {
              options.body = body;
          } else {
              headers['Content-Type'] = 'application/json';
              options.body = JSON.stringify(body);
          }
      }
      const res = await fetch(url, options);
      const data = await res.json();
      if (!res.ok) {
          throw new Error(data.error || 'An API error occurred');
      }
      return data;
  }
  
  function escapeHTML(str) {
      if (typeof str !== 'string') return '';
      return str.replace(/[&<>"']/g, m => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'})[m]);
  }

  restoreAuth();
});
