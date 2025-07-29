const fs = require('fs');
console.log('📁 Root directory files:', fs.readdirSync(__dirname));

try {
    console.log('📁 Routes directory files:', fs.readdirSync('./routes'));
} catch (err) {
    console.log('❌ Routes directory not found:', err.message);
}

try {
    console.log('📁 Config directory files:', fs.readdirSync('./config'));
} catch (err) {
    console.log('❌ Config directory not found:', err.message);
}

const express = require('express');
const cors = require('cors');
const path = require('path');
// Only load .env in development
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
} else {
    console.log('🚀 Production mode - using Railway environment variables');
    console.log('Available Railway MySQL vars:', Object.keys(process.env).filter(k => k.includes('MYSQL')));
}

// Import route modules
const shopRoutes = require('./routes/shops');
const itemRoutes = require('./routes/items');
const inventoryRoutes = require('./routes/inventory');
const statsRoutes = require('./routes/stats');

// Import database connection
const { testConnection } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (HTML, CSS, JS) from current directory
app.use(express.static(__dirname));

// Test database connection on startup
testConnection();

// API Routes
app.use('/api', shopRoutes);      // /api/shops, /api/branches
app.use('/api', itemRoutes);      // /api/items, /api/verify-item, /api/search-items
app.use('/api', inventoryRoutes); // /api/add-inventory, /api/delete-inventory
app.use('/api', statsRoutes);     // /api/health, /api/stats, /api/reports

// Root route - redirect to mobile app
app.get('/', (req, res) => {
    res.redirect('/inventory-app.html');
});

// Get server IP addresses for mobile access
function getNetworkIPs() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    const ips = [];

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                ips.push(net.address);
            }
        }
    }
    return ips;
}

console.log('🔍 Railway PORT variable:', process.env.PORT);
console.log('🔍 Final PORT value:', PORT);

// Start server
app.listen(PORT, () => {
    const ips = getNetworkIPs();
    
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('📊 Database connection status logged above');
    
    console.log('\n📱 MOBILE ACCESS:');
    console.log('   Put inventory-app.html in this folder, then access from phone:');
    
    if (ips.length > 0) {
        ips.forEach(ip => {
            console.log(`   📱 http://${ip}:${PORT}/inventory-app.html`);
        });
    } else {
        console.log('   📱 Find your IP address and use: http://YOUR-IP:3000/inventory-app.html');
    }
    
    console.log('\n📋 API Endpoints:');
    console.log('  GET  /api/health - Health check');
    console.log('  GET  /api/stats - Database statistics');
    console.log('  GET  /inventory-app.html - Mobile GUI');
    console.log('  POST /api/add-inventory - Add inventory');
    console.log('  DELETE /api/delete-inventory - Delete inventory');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🔄 Gracefully shutting down...');
    const { pool } = require('./config/database');
    await pool.end();
    console.log('✅ Database connections closed');
    process.exit(0);
});

module.exports = app;