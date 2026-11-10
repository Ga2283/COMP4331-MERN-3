document.addEventListener('DOMContentLoaded', () => {
    let allCollectibles = []; 
    let currentCategory = 'All';
    let searchQuery = '';

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    const grid = document.getElementById('collectionGrid');
    const userGreeting = document.getElementById('userGreeting');
    const logoutBtn = document.getElementById('logoutBtn');
    const searchInput = document.getElementById('searchInput');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const paginationInfo = document.getElementById('paginationInfo');
    const nextPageBtn = document.getElementById('nextPageBtn');

    // Add Modal Elements
    const addModal = document.getElementById('addModal');
    const openAddModalBtn = document.getElementById('openAddModalBtn');
    const closeAddModalBtn = document.getElementById('closeAddModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const addItemForm = document.getElementById('addItemForm');

    // Edit Modal Elements
    const editModal = document.getElementById('editModal');
    const closeEditModalBtn = document.getElementById('closeEditModalBtn');
    const cancelEditModalBtn = document.getElementById('cancelEditModalBtn');
    const editItemForm = document.getElementById('editItemForm');

    // 1. Fetch User Profile Data
    async function loadUserProfile() {
        try {
            const res = await fetch('/api/users/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Unauthorized');
            const user = await res.json();
            const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'My Account';
            userGreeting.textContent = fullName;
        } catch (err) {
            console.error('Profile fetch failed:', err);
            localStorage.removeItem('token');
            window.location.href = '/login.html';
        }
    }

    // 2. Handle Logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    });

    // 3. Fetch and Render Collectibles
    async function loadCollectibles() {
        try {
            const res = await fetch('/api/collectibles', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            allCollectibles = data.collectibles || [];
            renderFilteredCollectibles();
        } catch (err) {
            console.error('Error loading items:', err);
        }
    }

    // 4. Client-side Filtering & Rendering with Edit/Delete Buttons
    function renderFilteredCollectibles() {
        grid.innerHTML = '';

        const filtered = allCollectibles.filter(item => {
            const matchesCategory = currentCategory === 'All' || item.category === currentCategory;
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesCategory && matchesSearch;
        });

        if (filtered.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #718096;">No collectibles found.</p>';
            paginationInfo.textContent = `Showing 0 of 0`;
            if (nextPageBtn) nextPageBtn.style.display = 'none';
            return;
        }

        filtered.forEach(item => {
            const card = document.createElement('div');
            card.className = 'collection-card';
            card.innerHTML = `
                <div class="card-image-wrapper">
                    <img src="${item.image || 'https://via.placeholder.com/150?text=No+Image'}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/150?text=No+Image'">
                </div>
                <div class="card-body">
                    <span class="card-category">${item.category}</span>
                    <h4 class="card-title">${item.name}</h4>
                    <p class="card-desc">${item.description || 'No description provided.'}</p>
                    <div class="card-actions" style="margin-top: 10px; display: flex; gap: 8px;">
                        <button class="btn-secondary edit-btn" data-id="${item._id}" style="padding: 4px 10px; font-size: 12px; cursor: pointer;">Edit</button>
                        <button class="btn-danger delete-btn" data-id="${item._id}" style="padding: 4px 10px; font-size: 12px; background: #e53e3e; color: white; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
                    </div>
                </div>
            `;
	  card.addEventListener('click', (e) => {
                if (e.target.closest('.card-actions')) return;
                card.classList.toggle('expanded');
            });
            grid.appendChild(card);
        });

        paginationInfo.textContent = `Showing ${filtered.length} of ${allCollectibles.length}`;
        if (nextPageBtn) nextPageBtn.style.display = 'none';

        // Attach Delete Listeners
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this collectible?')) {
                    await deleteCollectible(id);
                }
            });
        });

        // Attach Edit Listeners
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                openEditModal(id);
            });
        });
    }

    // 5. Delete Collectible API Call
    async function deleteCollectible(id) {
        try {
            const res = await fetch(`/api/collectibles/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                loadCollectibles();
            } else {
                alert('Failed to delete item.');
            }
        } catch (err) {
            console.error('Error deleting item:', err);
        }
    }

    // 6. Open Edit Modal & Populate Data
    function openEditModal(id) {
        const item = allCollectibles.find(c => c._id === id);
        if (!item) return;

        document.getElementById('editItemId').value = item._id;
        document.getElementById('editItemName').value = item.name;
        document.getElementById('editItemCategory').value = item.category;
        document.getElementById('editItemDescription').value = item.description || '';
        document.getElementById('editItemImageUrl').value = item.image || '';

        editModal.style.display = 'flex';
    }

    // 7. Submit Edit Form (PATCH)
    editItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editItemId').value;
        const updatedData = {
            name: document.getElementById('editItemName').value,
            category: document.getElementById('editItemCategory').value,
            description: document.getElementById('editItemDescription').value,
            image: document.getElementById('editItemImageUrl').value
        };

        try {
            const res = await fetch(`/api/collectibles/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedData)
            });

            if (res.ok) {
                editModal.style.display = 'none';
                loadCollectibles();
            } else {
                const errData = await res.json();
                alert('Failed to update item: ' + (errData.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Error updating item:', err);
        }
    });

    // Search & Filter Event Listeners
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        renderFilteredCollectibles();
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.getAttribute('data-category');
            renderFilteredCollectibles();
        });
    });

    // Add Modal Handlers
    openAddModalBtn.addEventListener('click', () => addModal.style.display = 'flex');
    closeAddModalBtn.addEventListener('click', () => addModal.style.display = 'none');
    cancelModalBtn.addEventListener('click', () => addModal.style.display = 'none');

    // Edit Modal Close Handlers
    closeEditModalBtn.addEventListener('click', () => editModal.style.display = 'none');
    cancelEditModalBtn.addEventListener('click', () => editModal.style.display = 'none');

    // Submit New Item Form
    addItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newItem = {
            name: document.getElementById('itemName').value,
            category: document.getElementById('itemCategory').value,
            description: document.getElementById('itemDescription').value,
            image: document.getElementById('itemImageUrl').value
        };

        try {
            const res = await fetch('/api/collectibles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newItem)
            });

            if (res.ok) {
                addItemForm.reset();
                addModal.style.display = 'none';
                loadCollectibles();
            } else {
                const errData = await res.json();
                alert('Failed to save item: ' + (errData.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Error saving item:', err);
        }
    });

    // Initial Load
    loadUserProfile();
    loadCollectibles();
});
