const express = require('express');
const cors = require('cors');
require('dotenv').config();

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

// Test database connection on startup
testConnection();

// Routes
app.use('/api', shopRoutes);      // /api/shops, /api/branches
app.use('/api', itemRoutes);      // /api/items, /api/verify-item, /api/search-items
app.use('/api', inventoryRoutes); // /api/add-inventory, /api/delete-inventory
app.use('/api', statsRoutes);     // /api/health, /api/stats, /api/reports

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('📊 Connected to MySQL database "lg"');
    console.log('\n📋 Available endpoints:');
    console.log('  GET  /api/health - Health check');
    console.log('  GET  /api/stats - Database statistics');
    console.log('  GET  /api/shops - Get all active shops');
    console.log('  GET  /api/branches - Get all branches');
    console.log('  GET  /api/branches/:shopName - Get branches for shop');
    console.log('  GET  /api/product-categories - Get product categories');
    console.log('  GET  /api/companies - Get companies');
    console.log('  GET  /api/items - Get filtered items');
    console.log('  GET  /api/verify-item/:itemCode - Verify item existence');
    console.log('  GET  /api/search-items/:searchTerm - Search items');
    console.log('  POST /api/add-inventory - Add inventory count');
    console.log('  DELETE /api/delete-inventory - Delete inventory item');
    console.log('  GET  /api/inventory-summary - Get inventory summary');
    console.log('  GET  /api/inventory-entries - Get all inventory entries');
    console.log('  GET  /api/reports/inventory-by-date - Advanced reporting');
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