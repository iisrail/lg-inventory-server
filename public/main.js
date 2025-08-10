// ========================================
// MAIN APP MODULE (main.js)
// ========================================

// Initialize app when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 LG Inventory App Starting...');
    checkAuthAndInitialize();
});

// ========================================
// UTILITY FUNCTIONS
// ========================================

function scrollToNotes() {
    setTimeout(() => {
        const notesField = document.getElementById('notes');
        notesField.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
    }, 300);
}

// ========================================
// GLOBAL ERROR HANDLER
// ========================================

window.addEventListener('error', function(event) {
    console.error('🚨 Global Error:', event.error);
    showStatus('❌ An unexpected error occurred', 'error');
});

// ========================================
// CONSOLE STARTUP MESSAGE
// ========================================

console.log(`
🏢 LG Inventory Management System
📱 Mobile-Optimized Interface
🔐 Authentication: Enabled
📊 Reports: Israel Timezone Support
🛠️ Modular Architecture: 6 modules loaded

Modules:
├── auth.js (Authentication)
├── data-loader.js (API Data Loading)
├── form-handler.js (Form Management)
├── item-selector.js (Multi-select Items)
├── reports.js (Download & Reports)
└── main.js (App Initialization)

Ready to scan! 📦
`);