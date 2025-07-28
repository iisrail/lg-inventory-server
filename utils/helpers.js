const { ERROR_MESSAGES } = require('../config/constants');

// Validate basic inventory fields
function validateInventoryFields(body) {
    const { shop, branch, productCategory } = body;
    
    if (!shop || !branch || !productCategory) {
        return {
            isValid: false,
            error: `${ERROR_MESSAGES.MISSING_FIELDS}: shop, branch, productCategory`
        };
    }
    
    return { isValid: true };
}

// Get shop ID by name
async function getShopId(connection, shopName) {
    const [shopRows] = await connection.execute(
        'SELECT id FROM shops WHERE shop_name = ?',
        [shopName]
    );
    
    if (shopRows.length === 0) {
        throw new Error(`${ERROR_MESSAGES.SHOP_NOT_FOUND}: "${shopName}"`);
    }
    
    return shopRows[0].id;
}

// Get branch ID by name and shop ID
async function getBranchId(connection, branchName, shopId) {
    const [branchRows] = await connection.execute(
        'SELECT id FROM branches WHERE branch_name = ? AND shop_id = ?',
        [branchName, shopId]
    );
    
    if (branchRows.length === 0) {
        const [shopRows] = await connection.execute('SELECT shop_name FROM shops WHERE id = ?', [shopId]);
        const shopName = shopRows[0]?.shop_name || 'Unknown';
        throw new Error(`${ERROR_MESSAGES.BRANCH_NOT_FOUND} "${shopName}": "${branchName}"`);
    }
    
    return branchRows[0].id;
}

// Get item ID by item code, category, and company
async function getItemId(connection, itemCode, productCategory, company) {
    const [itemRows] = await connection.execute(`
        SELECT i.id 
        FROM items i
        JOIN product_categories pc ON i.product_category_id = pc.id
        JOIN companies c ON i.company_id = c.id
        WHERE i.item_code = ? AND pc.category_code = ? AND c.company_code = ?
    `, [itemCode, productCategory, company]);
    
    if (itemRows.length === 0) {
        throw new Error(`${ERROR_MESSAGES.ITEM_NOT_FOUND}: "${itemCode}" for category "${productCategory}" and company "${company}"`);
    }
    
    return itemRows[0].id;
}

// Get category item ID for totals (company = 'ALL')
async function getCategoryItemId(connection, productCategory) {
    const [categoryItemRows] = await connection.execute(`
        SELECT i.id 
        FROM items i
        JOIN product_categories pc ON i.product_category_id = pc.id
        JOIN companies c ON i.company_id = c.id
        WHERE i.item_code = ? AND c.company_code = 'ALL'
    `, [productCategory]);
    
    if (categoryItemRows.length === 0) {
        throw new Error(`${ERROR_MESSAGES.CATEGORY_NOT_FOUND}: "${productCategory}"`);
    }
    
    return categoryItemRows[0].id;
}

// Format success response for inventory operations
function formatInventoryResponse(mode, data) {
    if (mode === 'item') {
        return {
            shop: data.shop,
            branch: data.branch,
            category: data.productCategory,
            company: data.company,
            item: data.item,
            status: data.status,
            display: '✓'
        };
    } else {
        return {
            shop: data.shop,
            branch: data.branch,
            category: data.productCategory,
            totalAmount: data.amount
        };
    }
}

module.exports = {
    validateInventoryFields,
    getShopId,
    getBranchId,
    getItemId,
    getCategoryItemId,
    formatInventoryResponse
};