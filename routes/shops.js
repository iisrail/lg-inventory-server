const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Get all active shops for combo box
router.get('/shops', async (req, res) => {
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
router.get('/branches/:shopName', async (req, res) => {
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
router.get('/branches', async (req, res) => {
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
router.get('/product-categories', async (req, res) => {
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
router.get('/companies', async (req, res) => {
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

module.exports = router;