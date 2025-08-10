// ========================================
// ITEM SELECTOR MODULE (item-selector.js)
// ========================================

// ========================================
// MULTI-SELECT ITEM FUNCTIONS
// ========================================

function renderItemsCheckboxes() {
    const container = document.getElementById('itemsContainer');
    
    if (allItems.length === 0) {
        container.innerHTML = '<div class="no-items">No items available for this selection</div>';
        return;
    }
    
    let html = '';
    allItems.forEach(item => {
        const isSelected = selectedItems.has(item);
        html += `
            <div class="item-checkbox ${isSelected ? 'selected' : ''}" onclick="toggleItem('${item}')">
                <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="event.stopPropagation(); toggleItem('${item}')">
                <span class="item-code">${item}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
    updateSelectedSummary();
}

function toggleItem(itemCode) {
    if (selectedItems.has(itemCode)) {
        selectedItems.delete(itemCode);
    } else {
        selectedItems.add(itemCode);
    }
    renderItemsCheckboxes();
    checkFormComplete();
}

function selectAllItems() {
    const filteredItems = getFilteredItems();
    filteredItems.forEach(item => selectedItems.add(item));
    renderItemsCheckboxes();
    checkFormComplete();
}

function clearAllItems() {
    selectedItems.clear();
    renderItemsCheckboxes();
    checkFormComplete();
}

// ========================================
// ITEM FILTERING & SEARCH
// ========================================

function filterItems() {
    const searchTerm = document.getElementById('itemSearch').value.toLowerCase();
    const container = document.getElementById('itemsContainer');
    
    if (allItems.length === 0) {
        container.innerHTML = '<div class="no-items">No items available</div>';
        return;
    }
    
    const filteredItems = getFilteredItems();
    
    if (filteredItems.length === 0) {
        container.innerHTML = '<div class="no-items">No items match your search</div>';
        return;
    }
    
    let html = '';
    filteredItems.forEach(item => {
        const isSelected = selectedItems.has(item);
        html += `
            <div class="item-checkbox ${isSelected ? 'selected' : ''}" onclick="toggleItem('${item}')">
                <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="event.stopPropagation(); toggleItem('${item}')">
                <span class="item-code">${item}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function getFilteredItems() {
    const searchTerm = document.getElementById('itemSearch').value.toLowerCase();
    return allItems.filter(item => 
        item.toLowerCase().includes(searchTerm)
    );
}

// ========================================
// SELECTED ITEMS SUMMARY
// ========================================

function updateSelectedSummary() {
    const summaryDiv = document.getElementById('selectedSummary');
    const countDiv = document.getElementById('selectedCount');
    const listDiv = document.getElementById('selectedList');
    
    const count = selectedItems.size;
    
    if (count === 0) {
        summaryDiv.classList.remove('show');
        return;
    }
    
    summaryDiv.classList.add('show');
    countDiv.textContent = `${count} item${count === 1 ? '' : 's'} selected`;
    
    const itemList = Array.from(selectedItems).join(', ');
    listDiv.textContent = itemList;
}