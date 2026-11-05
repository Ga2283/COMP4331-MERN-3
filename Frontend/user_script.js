/**
 * MyCollection - Frontend Application Logic & API Integration Placeholder
 */

// Mock initial data matching layout requirements (4 per row x 3 rows = 12 per page)

// App State
let currentPage = 1;
const itemsPerPage = 12; // 4 columns x 3 rows = 12 items
let activeCategory = "All";
let searchQuery = "";
let fetchedItems = [];

// DOM Elements
const collectionGrid = document.getElementById("collectionGrid");
const nextPageBtn = document.getElementById("nextPageBtn");
const paginationInfo = document.getElementById("paginationInfo");
const searchInput = document.getElementById("searchInput");
const filterBtns = document.querySelectorAll(".filter-btn");
const addModal = document.getElementById("addModal");
const openAddModalBtn = document.getElementById("openAddModalBtn");
const closeAddModalBtn = document.getElementById("closeAddModalBtn");
const cancelModalBtn = document.getElementById("cancelModalBtn");
const addItemForm = document.getElementById("addItemForm");

// =========================================================================
// API ENDPOINT SECTION (Easy insertion for MongoDB / Express Integration)
// =========================================================================

/**
 * SECTION: Fetch User Collection from Express/MongoDB Backend
 * Target Endpoint: GET /api/collection?page={page}&limit=12&category={category}&search={search}
 */
async function fetchUserCollection(page = 1, category = "All", search = "") {
    try {
        /* 
        ==================================================================
        [INSERT YOUR AJAX / FETCH API CALL HERE WHEN BACKEND IS READY]
        ------------------------------------------------------------------
        const response = await fetch(`/api/collection?page=${page}&limit=12&category=${encodeURIComponent(category)}&search=${encodeURIComponent(search)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` // If JWT auth is used
            }
        });
        
        if (!response.ok) throw new Error("Failed to fetch collection");
        const data = await response.json(); // Returns JSON response: { items: [], totalCount: 14, totalPages: 2 }
        return data;
        ==================================================================
        */

        const startIndex = 0;
        const endIndex = page * itemsPerPage;
        const visibleItems = filtered.slice(startIndex, endIndex);

        return {
            items: visibleItems,
            totalCount: filtered.length,
            hasMore: endIndex < filtered.length
        };
    } catch (error) {
        console.error("Error fetching collection:", error);
        return { items: [], totalCount: 0, hasMore: false };
    }
}

/**
 * SECTION: Add New Collection Item to Backend
 * Target Endpoint: POST /api/collection
 */
async function createCollectionItem(itemData) {
    try {
        /* 
        ==================================================================
        [INSERT YOUR AJAX / FETCH POST CALL HERE WHEN BACKEND IS READY]
        ------------------------------------------------------------------
        const response = await fetch('/api/collection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(itemData)
        });

        if (!response.ok) throw new Error("Failed to add item");
        const newSavedItem = await response.json(); // Returns newly created JSON document
        return newSavedItem;
        ==================================================================
        */


    } catch (error) {
        console.error("Error creating item:", error);
        alert("Failed to create item.");
    }
}

// =========================================================================
// UI RENDER & PAGINATION LOGIC
// =========================================================================

async function renderCollection() {
    const data = await fetchUserCollection(currentPage, activeCategory, searchQuery);
    
    collectionGrid.innerHTML = "";
    
    if (data.items.length === 0) {
        collectionGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
                No items found in your collection.
            </div>
        `;
        nextPageBtn.style.display = "none";
        paginationInfo.innerText = "0 items";
        return;
    }

    data.items.forEach(item => {
        const badgeClass = item.category === "Cards" ? "badge-card" : 
                           item.category === "Comic books" ? "badge-comic" : "badge-figurine"; 
        const fallbackImg = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80";

        const card = document.createElement("div");
        card.className = "collection-card";
        card.innerHTML = `
            <div class="card-image-wrapper">
                <img src="${item.image || fallbackImg}" alt="${item.name}" onerror="this.src='${fallbackImg}'">
                <span class="category-badge ${badgeClass}">${item.category}</span>
            </div>
            <div class="card-content">
                <h4 class="card-title">${item.name}</h4>
                <p class="card-description">${item.description || "No description provided."}</p>
            </div>
        `;
        collectionGrid.appendChild(card);
    });

    // Update Pagination Info & Arrow Button visibility
    paginationInfo.innerText = `Showing ${data.items.length} of ${data.totalCount} items`;
    if (data.hasMore) {
        nextPageBtn.style.display = "flex";
    } else {
        nextPageBtn.style.display = "none";
    }
}

// Event Listeners
nextPageBtn.addEventListener("click", () => {
    currentPage++;
    renderCollection();
});

searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    currentPage = 1;
    renderCollection();
});

filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        filterBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeCategory = btn.getAttribute("data-category");
        currentPage = 1;
        renderCollection();
    });
});

// Modal Logic
openAddModalBtn.addEventListener("click", () => addModal.classList.add("active"));
closeAddModalBtn.addEventListener("click", () => addModal.classList.remove("active"));
cancelModalBtn.addEventListener("click", () => addModal.classList.remove("active"));

addItemForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newItem = {
        name: document.getElementById("itemName").value.trim(),
        category: document.getElementById("itemCategory").value,
        description: document.getElementById("itemDescription").value.trim(),
        image: document.getElementById("itemImageUrl").value.trim()
    };

    await createCollectionItem(newItem);
    addItemForm.reset();
    addModal.classList.remove("active");
    currentPage = 1;
    renderCollection();
});

// Initial Render
document.addEventListener("DOMContentLoaded", renderCollection);
