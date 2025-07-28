const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Health check endpoint
router.get('/health', async (req, res) => {
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

// Get database statistics
router.get('/stats', async (req, res) => {
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

// Advanced reporting endpoint
router.get('/reports/inventory-by-date', async (req, res) => {
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

module.exports = router;