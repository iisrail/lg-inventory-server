// ========================================
// REPORTS MODULE (reports.js) - FIXED
// ========================================

// ========================================
// DOWNLOAD MODAL FUNCTIONS
// ========================================

function showDownloadChoice() {
    document.getElementById('choiceModal').classList.add('show');
}

function closeChoiceModal() {
    document.getElementById('choiceModal').classList.remove('show');
}

// ========================================
// MAIN DOWNLOAD FUNCTION
// ========================================

async function downloadWork(scope) {
    closeChoiceModal();
    
    try {
        showStatus('📥 Preparing Excel file...', 'info');
        
        // Build API URL with user filter and date filter
        let apiUrl = `${API_BASE}/inventory-entries?limit=5000&user_id=${currentUser.id}`;
        let dateRange = '';
        
        // Add date parameters to API call based on scope
        if (scope === 'today') {
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            apiUrl += `&date=${today}`;
            dateRange = 'Today';
            console.log('📅 Requesting TODAY entries for user', currentUser.name, ':', today);
        } else if (scope === 'week') {
            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
            const startDate = startOfWeek.toISOString().split('T')[0];
            
            apiUrl += `&startDate=${startDate}`;
            dateRange = 'Current Week';
            console.log('📅 Requesting WEEK entries for user', currentUser.name, '(from Sunday):', startDate);
        } else if (scope === 'month') {
            const today = new Date();
            // FIX: Ensure we get the correct current month
            const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const startDate = startOfCurrentMonth.toISOString().split('T')[0];
            
            apiUrl += `&startDate=${startDate}`;
            dateRange = 'Current Month';
            console.log('📅 Requesting CURRENT MONTH entries for user', currentUser.name);
            console.log('📅 Start date:', startDate, '(should be 1st of', today.toLocaleString('default', { month: 'long' }), today.getFullYear() + ')');
        } else if (scope === 'last-month') {
            // FIX: Get actual previous month dates
            const today = new Date();
            const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            
            const startDate = firstDayLastMonth.toISOString().split('T')[0];
            const endDate = lastDayLastMonth.toISOString().split('T')[0];
            
            apiUrl += `&startDate=${startDate}&endDate=${endDate}`;
            dateRange = 'Previous Month';
            console.log('📅 Requesting LAST MONTH entries for user', currentUser.name, ':', startDate, 'to', endDate);
        } else {
            dateRange = 'All Time';
            console.log('📅 Requesting ALL entries for user', currentUser.name);
        }
        
        console.log('🔗 Final API URL:', apiUrl);
        
        const response = await fetch(apiUrl);
        let allEntries = await response.json();
        
        console.log('📊 Entries returned for user', currentUser.name, ':', allEntries.length);
        
        if (!Array.isArray(allEntries)) {
            showStatus('❌ Invalid data received from server', 'error');
            return;
        }
        
        if (allEntries.length === 0) {
            showStatus(`📝 You have no work done in ${dateRange.toLowerCase()}`, 'info');
            setTimeout(hideStatus, 3000);
            return;
        }
        
        // Sort by date (newest first)
        allEntries.sort((a, b) => {
            return new Date(b.entry_date) - new Date(a.entry_date);
        });
        
        console.log('📅 Your first entry:', allEntries[0].entry_date);
        console.log('📅 Your last entry:', allEntries[allEntries.length - 1].entry_date);
        
        generateWorkExcel(allEntries, dateRange, scope);
        
        showStatus(`📥 Downloaded! Your ${allEntries.length} entries from ${dateRange.toLowerCase()}`, 'success');
        setTimeout(hideStatus, 3000);
    } catch (error) {
        console.error('Download error:', error);
        showStatus('❌ Failed to download: ' + error.message, 'error');
    }
}

// ========================================
// EXCEL GENERATION
// ========================================

function generateWorkExcel(entries, dateRange, scope) {
    const headers = [
        'Date/Time', 'Shop', 'Branch', 'Category', 
        'Company', 'Item', 'Amount', 'Notes'
    ];
    
    const excelData = entries.map(entry => {
        const dateTimeFormatted = new Date(entry.entry_date).toLocaleString();
        
        let itemValue = '';
        let amountValue = '';
        
        if (entry.company === 'ALL') {
            amountValue = entry.amount.toString();
        } else {
            itemValue = entry.item || '';
            amountValue = '1';
        }
        
        return [
            dateTimeFormatted,
            entry.shop,
            entry.branch,
            entry.category,
            entry.company,
            itemValue,
            amountValue,
            entry.notes || ''
        ];
    });
    
    excelData.unshift(headers);
    
    const csvContent = excelData.map(row => 
        row.map(field => `"${field}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { 
        type: 'text/csv;charset=utf-8;' 
    });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    let filename;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0].replace(/-/g, '_');
    const userName = currentUser.name.replace(/[^a-zA-Z0-9]/g, '_'); // Clean username for filename
    
    switch (scope) {
        case 'today':
            filename = `${userName}_Inventory_Today_${todayStr}.csv`;
            break;
        case 'week':
            filename = `${userName}_Inventory_Week_${todayStr}.csv`;
            break;
        case 'month':
            filename = `${userName}_Inventory_Month_${todayStr}.csv`;
            break;
        case 'last-month':
            // FIX: Better filename for previous month
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            const lastMonthStr = lastMonth.toISOString().substr(0, 7).replace('-', '_'); // YYYY_MM
            filename = `${userName}_Inventory_Last_Month_${lastMonthStr}.csv`;
            break;
        default:
            filename = `${userName}_Inventory_Report_${todayStr}.csv`;
    }
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}