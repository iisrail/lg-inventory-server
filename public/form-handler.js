// ========================================
// FORM HANDLER MODULE (form-handler.js)
// ========================================

// Global variables for form state
let allItems = [];
let selectedItems = new Set();

// ========================================
// EVENT HANDLERS
// ========================================

function onShopChange() {
    const shop = document.getElementById('shop').value;
    const branchSelect = document.getElementById('branch');
    const categorySelect = document.getElementById('productCategory');
    resetAllDependentFields();
    
    if (shop) {
        branchSelect.disabled = false;
        branchSelect.innerHTML = '<option value="">Loading branches...</option>';
        loadBranchesForShop(shop);
        
        // Keep category disabled until branch is selected
        categorySelect.disabled = true;
        categorySelect.innerHTML = '<option value="">First select branch</option>';
    } else {
        branchSelect.disabled = true;
        branchSelect.innerHTML = '<option value="">First select shop</option>';
        categorySelect.disabled = true;
        categorySelect.innerHTML = '<option value="">First select shop</option>';
    }
    checkFormComplete();
}

function onBranchChange() {
    const branch = document.getElementById('branch').value;
    const categorySelect = document.getElementById('productCategory');
    const companySelect = document.getElementById('company');
    
    // Reset fields that depend on company selection
    document.getElementById('amount').value = '';
    clearAllItems();
    document.getElementById('itemSearch').value = '';
    document.getElementById('notes').value = '';
    document.getElementById('amountField').classList.remove('show');
    document.getElementById('itemField').classList.remove('show');
    
    if (branch) {
        // Enable category selection when branch is selected
        categorySelect.disabled = false;
        categorySelect.innerHTML = '<option value="">Loading categories...</option>';
        loadProductCategories(); // Reload categories
        
        // Reset and disable company until category is selected
        companySelect.disabled = true;
        companySelect.value = '';
        companySelect.innerHTML = '<option value="">First select category</option>';
    } else {
        // Disable category when no branch selected
        categorySelect.disabled = true;
        categorySelect.value = '';
        categorySelect.innerHTML = '<option value="">First select branch</option>';
        
        // Also disable company
        companySelect.disabled = true;
        companySelect.value = '';
        companySelect.innerHTML = '<option value="">First select category</option>';
    }
    
    checkFormComplete();
}

function onCategoryChange() {
    const category = document.getElementById('productCategory').value;
    const companySelect = document.getElementById('company');
    
    if (category) {
        // Enable company selection when category is selected
        companySelect.disabled = false;
        companySelect.value = '';
        companySelect.innerHTML = '<option value="">Loading companies...</option>';
        loadCompaniesForCategory();
    } else {
        // Disable company when no category selected
        companySelect.disabled = true;
        companySelect.value = '';
        companySelect.innerHTML = '<option value="">First select category</option>';
    }
    
    clearAllItems();
    document.getElementById('amountField').classList.remove('show');
    document.getElementById('itemField').classList.remove('show');
    document.getElementById('amount').value = '';
    document.getElementById('itemSearch').value = '';
    document.getElementById('notes').value = '';
    
    checkFormComplete();
}

function onCompanyChange() {
    const company = document.getElementById('company').value;
    const amountField = document.getElementById('amountField');
    const itemField = document.getElementById('itemField');
    
    document.getElementById('amount').value = '';
    document.getElementById('notes').value = '';
    clearAllItems();
    document.getElementById('itemSearch').value = '';
    
    if (company === 'ALL') {
        amountField.classList.add('show');
        itemField.classList.remove('show');
    } else if (company) {
        amountField.classList.remove('show');
        itemField.classList.add('show');
        loadItemsForCompany();
    } else {
        amountField.classList.remove('show');
        itemField.classList.remove('show');
    }
    checkFormComplete();
}

// ========================================
// FORM RESET FUNCTIONS
// ========================================

function resetAllDependentFields() {
    const branchSelect = document.getElementById('branch');
    const categorySelect = document.getElementById('productCategory');
    const companySelect = document.getElementById('company');
    
    // Reset branch
    branchSelect.value = '';
    branchSelect.innerHTML = '<option value="">First select shop</option>';
    branchSelect.disabled = true;
    
    // Reset category and disable it
    categorySelect.value = '';
    categorySelect.innerHTML = '<option value="">First select shop</option>';
    categorySelect.disabled = true;
    
    // Reset company and disable it
    companySelect.value = '';
    companySelect.innerHTML = '<option value="">First select category</option>';
    companySelect.disabled = true;
    
    // Reset form fields
    document.getElementById('amount').value = '';
    clearAllItems();
    document.getElementById('itemSearch').value = '';
    document.getElementById('notes').value = '';
    document.getElementById('amountField').classList.remove('show');
    document.getElementById('itemField').classList.remove('show');
}

function resetFieldsFromCategory() {
    const companySelect = document.getElementById('company');
    
    // Reset company selection and disable it
    companySelect.value = '';
    companySelect.innerHTML = '<option value="">First select category</option>';
    companySelect.disabled = true;
    
    // Reset form fields
    document.getElementById('amount').value = '';
    clearAllItems();
    document.getElementById('itemSearch').value = '';
    document.getElementById('notes').value = '';
    document.getElementById('amountField').classList.remove('show');
    document.getElementById('itemField').classList.remove('show');
}

function resetAfterSubmission() {
    document.getElementById('amount').value = '';
    document.getElementById('notes').value = '';
    clearAllItems();
    document.getElementById('itemSearch').value = '';
    document.getElementById('amountField').classList.remove('show');
    document.getElementById('itemField').classList.remove('show');
    onCompanyChange();
    checkFormComplete();
}

// ========================================
// FORM VALIDATION
// ========================================

function checkFormComplete() {
    const shop = document.getElementById('shop').value;
    const branch = document.getElementById('branch').value;
    const category = document.getElementById('productCategory').value;
    const company = document.getElementById('company').value;
    
    let isComplete = shop && branch && category && company;
    
    if (company === 'ALL') {
        const amount = document.getElementById('amount').value;
        const amountNum = parseInt(amount);
        isComplete = isComplete && amount !== '' && !isNaN(amountNum) && amountNum >= 0;
    } else if (company) {
        isComplete = isComplete && selectedItems.size > 0;
    }
    
    const updateBtn = document.getElementById('updateBtn');
    updateBtn.disabled = !isComplete;
}

// Add event listeners when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('change', checkFormComplete);
    document.addEventListener('input', checkFormComplete);
});

// ========================================
// FORM SUBMISSION
// ========================================

async function updateInventory() {
    const company = document.getElementById('company').value;
    const notes = document.getElementById('notes').value || null;
    
    const baseData = {
        shop: document.getElementById('shop').value,
        branch: document.getElementById('branch').value,
        productCategory: document.getElementById('productCategory').value,
        company: company,
        notes: notes
    };
    
    try {
        showStatus('🔄 Updating inventory...', 'info');
        
        if (company === 'ALL') {
            const amountValue = document.getElementById('amount').value;
            const amountNum = parseInt(amountValue);
            
            if (isNaN(amountNum) || amountNum < 0) {
                showStatus('❌ Please enter a valid amount (0 or greater)', 'error');
                return;
            }
            
            const data = Object.assign({}, baseData, { amount: amountNum });
            await submitSingleInventory(data);
        } else {
            const selectedItemsArray = Array.from(selectedItems);
            
            if (selectedItemsArray.length === 0) {
                showStatus('❌ Please select at least one item', 'error');
                return;
            }
            
            let successCount = 0;
            let errors = [];
            
            for (const item of selectedItemsArray) {
                try {
                    const data = Object.assign({}, baseData, { item: item });
                    await submitSingleInventory(data, false);
                    successCount++;
                } catch (error) {
                    console.error('Error submitting item:', item, error);
                    errors.push(`${item}: ${error.message}`);
                }
            }
            
            if (errors.length === 0) {
                showStatus(`✅ Successfully updated ${successCount} items!`, 'success');
            } else if (successCount > 0) {
                showStatus(`⚠️ Updated ${successCount} items, ${errors.length} failed`, 'error');
                console.error('Failed items:', errors);
            } else {
                showStatus(`❌ Failed to update items`, 'error');
                console.error('All items failed:', errors);
            }
        }
        
        resetAfterSubmission();
    } catch (error) {
        console.error('Update inventory error:', error);
        showStatus('❌ Connection error: ' + error.message, 'error');
    }
}

async function submitSingleInventory(data, showStatusMessage = true) {
    const dataWithUser = {
        shop: data.shop,
        branch: data.branch,
        productCategory: data.productCategory,
        company: data.company,
        item: data.item,
        amount: data.amount,
        notes: data.notes,
        user_id: currentUser.id,
        pic: currentUser.name
    };
    
    const response = await fetch(`${API_BASE}/add-inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataWithUser)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
        throw new Error(result.error || 'Update failed');
    }
    
    if (showStatusMessage) {
        showStatus(`✅ ${result.message}`, 'success');
    }
    
    return result;
}