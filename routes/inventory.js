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
        
        const { shop, branch, productCategory, company, item, amount } = req.body;
        
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
                SET amount = ?, entry_date = CURDATE()
                WHERE id = ?
            `, [finalAmount, existingId]);
            
            result = { insertId: existingId };
            action = 'updated';
            
        } else {
            // INSERT new record
            const [insertResult] = await connection.execute(`
                INSERT INTO inventory_entries 
                (user_id, shop_id, branch_id, item_id, amount, entry_date) 
                VALUES (?, ?, ?, ?, ?, CURDATE())
            `, [USER_ID, shopId, branchId, itemId, finalAmount]);
            
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

// Delete inventory item entry
router.delete('/delete-inventory', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { shop, branch, productCategory, company, item } = req.body;
        
        // Basic validation for delete
        if (!shop || !branch || !productCategory || !company || !item) {
            return res.status(400).json({
                error: 'Missing required fields: shop, branch, productCategory, company, item'
            });
        }
        
        // Only works for item mode (not category totals)
        if (company === 'ALL') {
            return res.status(400).json({
                error: ERROR_MESSAGES.CANNOT_DELETE_CATEGORY
            });
        }
        
        // Get IDs
        const shopId = await getShopId(connection, shop);
        const branchId = await getBranchId(connection, branch, shopId);
        const itemId = await getItemId(connection, item, productCategory, company);
        
        // Delete the most recent entry for this specific item FOR TODAY
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
        const [deleteResult] = await connection.execute(`
            DELETE FROM inventory_entries 
            WHERE user_id = ? AND shop_id = ? AND branch_id = ? AND item_id = ?
            AND DATE(entry_date) = ?
            ORDER BY entry_date DESC 
            LIMIT 1
        `, [USER_ID, shopId, branchId, itemId, today]);
        
        await connection.commit();
        
        if (deleteResult.affectedRows === 0) {
            res.json({
                success: false,
                message: `No entry found to delete for item "${item}" (${company}) in ${shop} - ${branch}`,
                deletedEntries: 0
            });
        } else {
            res.json({
                success: true,
                message: SUCCESS_MESSAGES.ITEM_DELETED(item, company, shop, branch),
                deletedEntries: deleteResult.affectedRows,
                data: {
                    shop: shop,
                    branch: branch,
                    category: productCategory,
                    company: company,
                    item: item,
                    status: 'deleted'
                }
            });
        }
        
    } catch (error) {
        await connection.rollback();
        console.error('Error deleting inventory:', error);
        res.status(500).json({ error: error.message || 'Failed to delete inventory' });
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
router.get('/inventory-entries', async (req, res) => {
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

module.exports = router;