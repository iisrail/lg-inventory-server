// ========================================
// AUTHENTICATION MODULE (auth.js)
// ========================================

// Global authentication variables
let currentUser = null;

// ========================================
// AUTHENTICATION FUNCTIONS
// ========================================

async function checkAuthAndInitialize() {
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
        try {
            currentUser = JSON.parse(storedUser);
            hideLoginScreen();
            showUserInfo();
            await initializeApp();
            return;
        } catch (error) {
            console.log('Invalid stored user data');
            sessionStorage.removeItem('currentUser');
        }
    }
    showLoginScreen();
}

function showLoginScreen() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

function hideLoginScreen() {
    document.getElementById('loginScreen').classList.add('hidden');
}

function showUserInfo() {
    if (currentUser) {
        document.getElementById('userInfo').textContent = `👤 ${currentUser.name}`;
        document.getElementById('userInfo').style.display = 'block';
        document.getElementById('logoutBtn').style.display = 'block';
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');
    
    loginError.classList.remove('show');
    
    try {
        loginBtn.disabled = true;
        loginBtn.textContent = '🔄 Logging in...';
        
        const response = await fetch(`${API_BASE}/simple-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            currentUser = result.user;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            hideLoginScreen();
            showUserInfo();
            await initializeApp();
            showStatus(`✅ Welcome ${currentUser.name}!`, 'success');
            setTimeout(hideStatus, 3000);
        } else {
            loginError.textContent = result.error || 'Login failed';
            loginError.classList.add('show');
        }
    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = 'Connection error. Please try again.';
        loginError.classList.add('show');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = '🔐 Login';
    }
}

function logout() {
    currentUser = null;
    sessionStorage.removeItem('currentUser');
    document.getElementById('inventoryForm').reset();
    resetAllDependentFields();
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').classList.remove('show');
    showLoginScreen();
    showStatus('👋 Logged out successfully', 'info');
    setTimeout(hideStatus, 2000);
}

// ========================================
// INITIALIZATION FUNCTION
// ========================================

async function initializeApp() {
    showStatus('🔄 Loading data...', 'info');
    try {
        await Promise.all([
            loadShops(),
            loadProductCategories(),
            loadCompanies()
        ]);
        showStatus('✅ Ready to scan!', 'success');
        setTimeout(hideStatus, 2000);
    } catch (error) {
        showStatus('❌ Failed to load: ' + error.message, 'error');
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function showStatus(message, type) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    statusDiv.className = `status-message status-${type} show`;
}

function hideStatus() {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.classList.remove('show');
}

function scrollToNotes() {
    setTimeout(() => {
        const notesField = document.getElementById('notes');
        notesField.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
    }, 300);
}