const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { USER_ID, ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../config/constants');
const { validateInventoryFields, getShopId, getBranchId, getItemId, getCategoryItemId } = require('../utils/helpers');

// Add inventory count - Two modes: specific item or category total
router.post('/add-inventory', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { shop, branch, productCategory, company, item, amount, notes } = req.body;
        
        // Basic validation
        const validation = validateInventoryFields(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.error });
        }
        
        // Determine inventory mode
        const isItemMode = item && company && (company !== 'ALL');
        const isCategoryMode = !item && (!company || company === 'ALL');
        
        if (!isItemMode && !isCategoryMode) {
            return res.status(400).json({
                error: ERROR_MESSAGES.INVALID_MODE
            });
        }
        
        // Mode-specific validation
        if (isItemMode) {
            // MODE 1: ITEM TRACKING - Just ADD (no amount needed)
            if (amount !== undefined && amount !== null) {
                return res.status(400).json({
                    error: ERROR_MESSAGES.ITEM_MODE_NO_AMOUNT
                });
            }
        } else {
            // MODE 2: CATEGORY TOTAL - Amount required
            if (amount === undefined || amount === null) {
                return res.status(400).json({
                    error: ERROR_MESSAGES.CATEGORY_MODE_AMOUNT_REQUIRED
                });
            }
            
            if (amount < 0) {
                return res.status(400).json({
                    error: ERROR_MESSAGES.CATEGORY_MODE_NEGATIVE
                });
            }
        }
        
        // Get IDs
        const shopId = await getShopId(connection, shop);
        const branchId = await getBranchId(connection, branch, shopId);
        
        let itemId, finalAmount, mode;
        
        if (isItemMode) {
            // MODE 1: SPECIFIC ITEM TRACKING
            mode = 'item';
            finalAmount = 1; // Items are just marked as available
            itemId = await getItemId(connection, item, productCategory, company);
        } else {
            // MODE 2: CATEGORY TOTAL (ALL COMPANIES)
            mode = 'category';
            finalAmount = parseInt(amount);
            itemId = await getCategoryItemId(connection, productCategory);
        }
        
        // Check if record already exists for today
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
        const [existingRows] = await connection.execute(`
            SELECT id FROM inventory_entries 
            WHERE user_id = ? AND shop_id = ? AND branch_id = ? AND item_id = ? 
            AND DATE(entry_date) = ?
        `, [USER_ID, shopId, branchId, itemId, today]);
        
        let result;
        let action;
        
        if (existingRows.length > 0) {
            // UPDATE existing record
            const existingId = existingRows[0].id;
            
            await connection.execute(`
                UPDATE inventory_entries 
                SET amount = ?, notes = ?, entry_date = CURDATE()
                WHERE id = ?
            `, [finalAmount, notes, existingId]);
            
            result = { insertId: existingId };
            action = 'updated';
            
        } else {
            // INSERT new record
            const [insertResult] = await connection.execute(`
                INSERT INTO inventory_entries 
                (user_id, shop_id, branch_id, item_id, amount, notes, entry_date) 
                VALUES (?, ?, ?, ?, ?, ?, CURDATE())
            `, [USER_ID, shopId, branchId, itemId, finalAmount, notes]);
            
            result = insertResult;
            action = 'created';
        }
        
        await connection.commit();
        
        // Success response
        let successMessage;
        if (mode === 'item') {
            successMessage = action === 'updated' 
                ? `Item "${item}" (${company}) UPDATED in ${shop} - ${branch} ✓`
                : `Item "${item}" (${company}) ADDED to ${shop} - ${branch} ✓`;
        } else {
            if (finalAmount === 0) {
                successMessage = action === 'updated'
                    ? `Category "${productCategory}" total UPDATED to 0 (no items) in ${shop} - ${branch}`
                    : `Category "${productCategory}" total set to 0 (no items) in ${shop} - ${branch}`;
            } else {
                successMessage = action === 'updated'
                    ? `Category "${productCategory}" total UPDATED to ${finalAmount} items in ${shop} - ${branch}`
                    : `Category "${productCategory}" total set to ${finalAmount} items in ${shop} - ${branch}`;
            }
        }
        
        res.json({
            success: true,
            message: successMessage,
            mode: mode,
            action: action,
            entryId: result.insertId,
            data: {
                shop: shop,
                branch: branch,
                category: productCategory,
                date: today,
                notes: notes,
                ...(mode === 'item' ? { 
                    company: company, 
                    item: item, 
                    status: action,
                    display: '✓'
                } : { 
                    totalAmount: finalAmount 
                })
            }
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Error adding inventory:', error);
        res.status(500).json({ error: error.message || 'Failed to add inventory' });
    } finally {
        connection.release();
    }
});

// Get inventory summary by product category
router.get('/inventory-summary', async (req, res) => {
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
                ie.created_at as entry_date,
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
            query += ' AND DATE(ie.created_at) >= ?';
            params.push(startDate);
        }
        
        if (endDate) {
            query += ' AND DATE(ie.created_at) <= ?';
            params.push(endDate);
        }
        
        query += ' ORDER BY ie.created_at DESC, pc.category_code';
        
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

// FIXED: Get all inventory entries with optional filtering
router.get('/inventory-entries', async (req, res) => {
    try {
        // Get parameters
        const requestedLimit = parseInt(req.query.limit) || 1000;
        const filterShop = req.query.shop;
        const filterBranch = req.query.branch;
        const filterDate = req.query.date;
        
        // Build query with optional WHERE conditions - USING created_at for time
        let query = `
            SELECT 
                ie.id,
                ie.created_at as entry_date,
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
            WHERE 1=1
        `;
        
        const params = [];
        
        // Add shop filter if provided
        if (filterShop) {
            query += ` AND s.shop_name = ?`;
            params.push(filterShop);
        }
        
        // Add branch filter if provided
        if (filterBranch) {
            query += ` AND b.branch_name = ?`;
            params.push(filterBranch);
        }
        
        // Add date filter if provided - using created_at for date comparison
        if (filterDate) {
            query += ` AND DATE(ie.created_at) = ?`;
            params.push(filterDate);
        }
        
        // FIXED: Proper sorting - shop, branch, category, company (ALL at end), then time
        query += ` ORDER BY s.shop_name ASC, b.branch_name ASC, pc.category_code ASC, CASE WHEN c.company_code = 'ALL' THEN 'ZZZ' ELSE c.company_code END ASC, ie.created_at ASC LIMIT ${Math.min(requestedLimit, 2000)}`;
        
        console.log('Final query:', query);
        console.log('Params:', params);
        
        const [rows] = await pool.execute(query, params);
        
        // Debug: Log first few results to verify sorting
        if (rows.length > 0) {
            console.log('First 5 sorted results:');
            rows.slice(0, 5).forEach((row, i) => {
                console.log(`${i+1}. ${row.shop} → ${row.branch} → ${row.category} → ${row.company} → ${row.item || 'Total: ' + row.amount}`);
            });
        }
        
        // Ensure we always return an array
        const entries = Array.isArray(rows) ? rows : [];
        
        res.json(entries);
        
    } catch (error) {
        console.error('Error fetching inventory entries:', error);
        
        // Return empty array to prevent frontend filter errors
        res.json([]);
    }
});

module.exports = router;