const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Get items filtered by product category and/or company
router.get('/items', async (req, res) => {
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

// Verify if an item exists in the database
router.get('/verify-item/:itemCode', async (req, res) => {
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
router.get('/search-items/:searchTerm', async (req, res) => {
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

module.exports = router;