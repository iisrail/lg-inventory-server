const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import route modules
const shopRoutes = require('./routes/shops');
const itemRoutes = require('./routes/items');
const inventoryRoutes = require('./routes/inventory');
const statsRoutes = require('./routes/stats');
const simpleAuthRoutes = require('./routes/simple-auth');

// Import database connection
const { testConnection } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Test database connection on startup
testConnection();
// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));
// Auth routes (no authentication required)
app.use('/api', simpleAuthRoutes);
app.use('/api', shopRoutes);
app.use('/api', itemRoutes);
app.use('/api', inventoryRoutes);
app.use('/api', statsRoutes);

// Serve the main app at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'inventory-app.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('🔐 Authentication enabled');
    // ... rest of your console logs
});

module.exports = app;