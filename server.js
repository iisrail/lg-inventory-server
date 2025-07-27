const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL connection configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lg',
    port: process.env.DB_PORT || 3306,  // ← Add this line
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Create MySQL connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to MySQL database successfully');
        connection.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
}

// Initialize database connection
testConnection();

// 1. API ENDPOINTS FOR GUI COMBO BOXES

// Get all active shops for combo box
app.get('/api/shops', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT id, shop_name FROM shops WHERE status = 1 ORDER BY shop_name'
        );
        
        const shops = rows.map(shop => ({
            id: shop.id,
            name: shop.shop_name
        }));
        
        res.json(shops);
    } catch (error) {
        console.error('Error fetching shops:', error);
        res.status(500).json({ error: 'Failed to fetch shops' });
    }
});

// Get branches for a specific shop
app.get('/api/branches/:shopName', async (req, res) => {
    try {
        const shopName = req.params.shopName;
        
        const [rows] = await pool.execute(`
            SELECT DISTINCT b.branch_name 
            FROM branches b 
            JOIN shops s ON b.shop_id = s.id 
            WHERE s.shop_name = ? AND b.status = 1
            ORDER BY b.branch_name
        `, [shopName]);
        
        const branches = rows.map(branch => branch.branch_name);
        res.json(branches);
    } catch (error) {
        console.error('Error fetching branches:', error);
        res.status(500).json({ error: 'Failed to fetch branches' });
    }
});

// Get all branches (for initial combo box population)
app.get('/api/branches', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT DISTINCT branch_name FROM branches WHERE status = 1 ORDER BY branch_name'
        );
        
        const branches = rows.map(branch => branch.branch_name);
        res.json(branches);
    } catch (error) {
        console.error('Error fetching branches:', error);
        res.status(500).json({ error: 'Failed to fetch branches' });
    }
});

// Get all product categories for combo box
app.get('/api/product-categories', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT id, category_code FROM product_categories ORDER BY category_code'
        );
        
        const categories = rows.map(category => ({
            id: category.id,
            name: category.category_code
        }));
        
        res.json(categories);
    } catch (error) {
        console.error('Error fetching product categories:', error);
        res.status(500).json({ error: 'Failed to fetch product categories' });
    }
});

// Get all companies for combo box
app.get('/api/companies', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT id, company_code FROM companies ORDER BY company_code'
        );
        
        const companies = rows.map(company => ({
            id: company.id,
            name: company.company_code
        }));
        
        res.json(companies);
    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({ error: 'Failed to fetch companies' });
    }
});

// Get items filtered by product category and/or company
app.get('/api/items', async (req, res) => {
    try {
        const { productCategory, company } = req.query;
        
        let query = `
            SELECT DISTINCT i.item_code 
            FROM items i
            JOIN product_categories pc ON i.product_category_id = pc.id
            JOIN companies c ON i.company_id = c.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (productCategory) {
            query += ' AND pc.category_code = ?';
            params.push(productCategory);
        }
        
        if (company) {
            query += ' AND c.company_code = ?';
            params.push(company);
        }
        
        query += ' ORDER BY i.item_code';
        
        const [rows] = await pool.execute(query, params);
        const items = rows.map(item => item.item_code);
        
        res.json(items);
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
});

// 2. VERIFY ITEM EXISTENCE

// Verify if an item exists in the database
app.get('/api/verify-item/:itemCode', async (req, res) => {
    try {
        const itemCode = req.params.itemCode;
        
        const [rows] = await pool.execute(`
            SELECT i.item_code, pc.category_code, c.company_code
            FROM items i
            JOIN product_categories pc ON i.product_category_id = pc.id
            JOIN companies c ON i.company_id = c.id
            WHERE i.item_code = ?
        `, [itemCode]);
        
        if (rows.length > 0) {
            const item = rows[0];
            res.json({
                exists: true,
                item: {
                    code: item.item_code,
                    productCategory: item.category_code,
                    company: item.company_code
                }
            });
        } else {
            res.json({
                exists: false,
                message: 'Item not found in database'
            });
        }
    } catch (error) {
        console.error('Error verifying item:', error);
        res.status(500).json({ error: 'Failed to verify item' });
    }
});

// Advanced item search with partial matching
app.get('/api/search-items/:searchTerm', async (req, res) => {
    try {
        const searchTerm = req.params.searchTerm;
        
        const [rows] = await pool.execute(`
            SELECT i.item_code, pc.category_code, c.company_code
            FROM items i
            JOIN product_categories pc ON i.product_category_id = pc.id
            JOIN companies c ON i.company_id = c.id
            WHERE i.item_code LIKE ?
            ORDER BY i.item_code
            LIMIT 50
        `, [`%${searchTerm}%`]);
        
        const results = rows.map(item => ({
            code: item.item_code,
            productCategory: item.category_code,
            company: item.company_code
        }));
        
        res.json(results);
    } catch (error) {
        console.error('Error searching items:', error);
        res.status(500).json({ error: 'Failed to search items' });
    }
});

// 3. ADD INVENTORY COUNT

// Add inventory count for a product category or specific item
app.post('/api/add-inventory', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const {
            pic,
            shop,
            branch,
            productCategory,
            company = 'ALL',
            item,
            amount
        } = req.body;
        
        // Validation
        if (!pic || !shop || !branch || !productCategory || !amount) {
            return res.status(400).json({
                error: 'Missing required fields: pic, shop, branch, productCategory, amount'
            });
        }
        
        // Get or create user
        let [userRows] = await connection.execute(
            'SELECT id FROM users WHERE name = ?',
            [pic]
        );
        
        let userId;
        if (userRows.length === 0) {
            const [result] = await connection.execute(
                'INSERT INTO users (name) VALUES (?)',
                [pic]
            );
            userId = result.insertId;
        } else {
            userId = userRows[0].id;
        }
        
        // Get shop ID
        const [shopRows] = await connection.execute(
            'SELECT id FROM shops WHERE shop_name = ?',
            [shop]
        );
        
        if (shopRows.length === 0) {
            throw new Error(`Shop "${shop}" not found`);
        }
        const shopId = shopRows[0].id;
        
        // Get branch ID
        const [branchRows] = await connection.execute(
            'SELECT id FROM branches WHERE branch_name = ? AND shop_id = ?',
            [branch, shopId]
        );
        
        if (branchRows.length === 0) {
            throw new Error(`Branch "${branch}" not found for shop "${shop}"`);
        }
        const branchId = branchRows[0].id;
        
        // Get item ID - handle both specific items and category totals
        let itemId;
        
        if (item && item !== productCategory) {
            // Specific item
            const [itemRows] = await connection.execute(`
                SELECT i.id 
                FROM items i
                JOIN product_categories pc ON i.product_category_id = pc.id
                JOIN companies c ON i.company_id = c.id
                WHERE i.item_code = ? AND pc.category_code = ?
            `, [item, productCategory]);
            
            if (itemRows.length === 0) {
                throw new Error(`Item "${item}" not found in category "${productCategory}"`);
            }
            itemId = itemRows[0].id;
        } else {
            // Category total - use the special category item with company 'ALL'
            const [itemRows] = await connection.execute(`
                SELECT i.id 
                FROM items i
                JOIN product_categories pc ON i.product_category_id = pc.id
                JOIN companies c ON i.company_id = c.id
                WHERE i.item_code = pc.category_code AND c.company_code = 'ALL'
            `, []);
            
            const categoryItem = itemRows.find(row => row.id);
            if (!categoryItem) {
                throw new Error(`Category total item not found for "${productCategory}"`);
            }
            itemId = categoryItem.id;
        }
        
        // Insert inventory entry
        const [result] = await connection.execute(`
            INSERT INTO inventory_entries 
            (user_id, shop_id, branch_id, item_id, amount, entry_date) 
            VALUES (?, ?, ?, ?, ?, NOW())
        `, [userId, shopId, branchId, itemId, parseInt(amount)]);
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Inventory count added successfully',
            entryId: result.insertId
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Error adding inventory:', error);
        res.status(500).json({ error: error.message || 'Failed to add inventory count' });
    } finally {
        connection.release();
    }
});

// Get inventory summary by product category
app.get('/api/inventory-summary', async (req, res) => {
    try {
        const { shop, branch, productCategory, startDate, endDate } = req.query;
        
        let query = `
            SELECT 
                pc.category_code as category,
                c.company_code as company,
                i.item_code as item,
                s.shop_name as shop,
                b.branch_name as branch,
                u.name as pic,
                ie.amount,
                ie.entry_date,
                ie.notes
            FROM inventory_entries ie
            JOIN users u ON ie.user_id = u.id
            JOIN shops s ON ie.shop_id = s.id
            JOIN branches b ON ie.branch_id = b.id
            JOIN items i ON ie.item_id = i.id
            JOIN product_categories pc ON i.product_category_id = pc.id
            JOIN companies c ON i.company_id = c.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (shop) {
            query += ' AND s.shop_name = ?';
            params.push(shop);
        }
        
        if (branch) {
            query += ' AND b.branch_name = ?';
            params.push(branch);
        }
        
        if (productCategory) {
            query += ' AND pc.category_code = ?';
            params.push(productCategory);
        }
        
        if (startDate) {
            query += ' AND DATE(ie.entry_date) >= ?';
            params.push(startDate);
        }
        
        if (endDate) {
            query += ' AND DATE(ie.entry_date) <= ?';
            params.push(endDate);
        }
        
        query += ' ORDER BY ie.entry_date DESC, pc.category_code';
        
        const [rows] = await pool.execute(query, params);
        
        // Group by category
        const summary = {};
        rows.forEach(row => {
            const category = row.category;
            if (!summary[category]) {
                summary[category] = {
                    category,
                    totalAmount: 0,
                    entries: []
                };
            }
            
            summary[category].totalAmount += row.amount;
            summary[category].entries.push({
                date: row.entry_date,
                pic: row.pic,
                shop: row.shop,
                branch: row.branch,
                company: row.company,
                item: row.item,
                amount: row.amount,
                notes: row.notes
            });
        });
        
        res.json(Object.values(summary));
        
    } catch (error) {
        console.error('Error getting inventory summary:', error);
        res.status(500).json({ error: 'Failed to get inventory summary' });
    }
});

// Get all inventory entries (for debugging/admin)
app.get('/api/inventory-entries', async (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        
        const [rows] = await pool.execute(`
            SELECT 
                ie.id,
                ie.entry_date,
                u.name as pic,
                s.shop_name as shop,
                b.branch_name as branch,
                pc.category_code as category,
                c.company_code as company,
                i.item_code as item,
                ie.amount,
                ie.notes
            FROM inventory_entries ie
            JOIN users u ON ie.user_id = u.id
            JOIN shops s ON ie.shop_id = s.id
            JOIN branches b ON ie.branch_id = b.id
            JOIN items i ON ie.item_id = i.id
            JOIN product_categories pc ON i.product_category_id = pc.id
            JOIN companies c ON i.company_id = c.id
            ORDER BY ie.entry_date DESC
            LIMIT ? OFFSET ?
        `, [parseInt(limit), parseInt(offset)]);
        
        res.json(rows);
    } catch (error) {
        console.error('Error fetching inventory entries:', error);
        res.status(500).json({ error: 'Failed to fetch inventory entries' });
    }
});

// UTILITY ENDPOINTS

// Get database statistics
app.get('/api/stats', async (req, res) => {
    try {
        const [shopCount] = await pool.execute('SELECT COUNT(*) as count FROM shops WHERE status = 1');
        const [branchCount] = await pool.execute('SELECT COUNT(*) as count FROM branches WHERE status = 1');
        const [categoryCount] = await pool.execute('SELECT COUNT(*) as count FROM product_categories');
        const [companyCount] = await pool.execute('SELECT COUNT(*) as count FROM companies');
        const [itemCount] = await pool.execute('SELECT COUNT(*) as count FROM items');
        const [entryCount] = await pool.execute('SELECT COUNT(*) as count FROM inventory_entries');
        const [userCount] = await pool.execute('SELECT COUNT(*) as count FROM users');
        
        const stats = {
            shops: shopCount[0].count,
            branches: branchCount[0].count,
            productCategories: categoryCount[0].count,
            companies: companyCount[0].count,
            items: itemCount[0].count,
            inventoryEntries: entryCount[0].count,
            users: userCount[0].count
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Error getting statistics:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        await pool.execute('SELECT 1');
        res.json({ 
            status: 'OK', 
            database: 'Connected',
            timestamp: new Date().toISOString() 
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'ERROR', 
            database: 'Disconnected',
            error: error.message,
            timestamp: new Date().toISOString() 
        });
    }
});

// Advanced reporting endpoint
app.get('/api/reports/inventory-by-date', async (req, res) => {
    try {
        const { startDate, endDate, groupBy = 'day' } = req.query;
        
        let dateFormat;
        switch (groupBy) {
            case 'hour':
                dateFormat = '%Y-%m-%d %H:00:00';
                break;
            case 'day':
                dateFormat = '%Y-%m-%d';
                break;
            case 'week':
                dateFormat = '%Y-%u';
                break;
            case 'month':
                dateFormat = '%Y-%m';
                break;
            default:
                dateFormat = '%Y-%m-%d';
        }
        
        let query = `
            SELECT 
                DATE_FORMAT(ie.entry_date, ?) as period,
                pc.category_code as category,
                COUNT(*) as entry_count,
                SUM(ie.amount) as total_amount
            FROM inventory_entries ie
            JOIN items i ON ie.item_id = i.id
            JOIN product_categories pc ON i.product_category_id = pc.id
            WHERE 1=1
        `;
        
        const params = [dateFormat];
        
        if (startDate) {
            query += ' AND DATE(ie.entry_date) >= ?';
            params.push(startDate);
        }
        
        if (endDate) {
            query += ' AND DATE(ie.entry_date) <= ?';
            params.push(endDate);
        }
        
        query += ' GROUP BY period, pc.category_code ORDER BY period DESC, pc.category_code';
        
        const [rows] = await pool.execute(query, params);
        res.json(rows);
        
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

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
    console.log('  GET  /api/items?productCategory=&company= - Get filtered items');
    console.log('  GET  /api/verify-item/:itemCode - Verify item existence');
    console.log('  GET  /api/search-items/:searchTerm - Search items');
    console.log('  POST /api/add-inventory - Add inventory count');
    console.log('  GET  /api/inventory-summary - Get inventory summary');
    console.log('  GET  /api/inventory-entries - Get all inventory entries');
    console.log('  GET  /api/reports/inventory-by-date - Advanced reporting');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🔄 Gracefully shutting down...');
    await pool.end();
    console.log('✅ Database connections closed');
    process.exit(0);
});

module.exports = app;