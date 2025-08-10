// ========================================
// DATA LOADER MODULE (data-loader.js)
// ========================================

// API Configuration
const API_BASE = '/api';

// ========================================
// SHOP & BRANCH LOADING
// ========================================

async function loadShops() {
    const response = await fetch(`${API_BASE}/shops`);
    const shops = await response.json();
    const shopSelect = document.getElementById('shop');
    shopSelect.innerHTML = '<option value="">Select Shop</option>';
    shops.forEach(shop => {
        shopSelect.innerHTML += `<option value="${shop.name}">${shop.name}</option>`;
    });
}

async function loadBranchesForShop(shopName) {
    try {
        const response = await fetch(`${API_BASE}/branches/${encodeURIComponent(shopName)}`);
        const branches = await response.json();
        const branchSelect = document.getElementById('branch');
        branchSelect.innerHTML = '<option value="">Select Branch</option>';
        branches.forEach(branch => {
            branchSelect.innerHTML += `<option value="${branch}">${branch}</option>`;
        });
    } catch (error) {
        showStatus('❌ Failed to load branches', 'error');
    }
}

// ========================================
// CATEGORY & COMPANY LOADING
// ========================================

async function loadProductCategories() {
    const response = await fetch(`${API_BASE}/product-categories`);
    const categories = await response.json();
    const categorySelect = document.getElementById('productCategory');
    categorySelect.innerHTML = '<option value="">Select Category</option>';
    categories.forEach(category => {
        categorySelect.innerHTML += `<option value="${category.name}">${category.name}</option>`;
    });
}

async function loadCompanies() {
    const response = await fetch(`${API_BASE}/companies`);
    const companies = await response.json();
    const companySelect = document.getElementById('company');
    companySelect.innerHTML = '<option value="">Select Company</option>';
    companies.forEach(company => {
        companySelect.innerHTML += `<option value="${company.name}">${company.name}</option>`;
    });
}

async function loadCompaniesForCategory() {
    const category = document.getElementById('productCategory').value;
    const companySelect = document.getElementById('company');
    
    if (!category) {
        companySelect.innerHTML = '<option value="">Select Category first</option>';
        return;
    }
    
    try {
        const allCompaniesResponse = await fetch(`${API_BASE}/companies`);
        const companies = await allCompaniesResponse.json();
        
        companySelect.innerHTML = '<option value="">Select Company</option>';
        companies.forEach(company => {
            companySelect.innerHTML += `<option value="${company.name}">${company.name}</option>`;
        });
    } catch (error) {
        console.error('Error loading companies for category:', error);
        showStatus('❌ Failed to load companies for category', 'error');
        companySelect.innerHTML = '<option value="">Error loading companies</option>';
    }
}

// ========================================
// ITEM LOADING
// ========================================

async function loadItemsForCompany() {
    const category = document.getElementById('productCategory').value;
    const company = document.getElementById('company').value;
    
    if (!category || !company || company === 'ALL') return;
    
    try {
        showStatus('🔄 Loading items...', 'info');
        
        const params = new URLSearchParams({
            productCategory: category,
            company: company
        });
        
        const response = await fetch(`${API_BASE}/items?${params}`);
        allItems = await response.json();
        
        renderItemsCheckboxes();
        hideStatus();
    } catch (error) {
        showStatus('❌ Failed to load items', 'error');
        allItems = [];
        renderItemsCheckboxes();
    }
}