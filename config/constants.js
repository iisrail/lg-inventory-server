// Application constants

// User configuration
const USER_ID = 1; // Elishay user ID (hardcoded for now)

// Error messages
const ERROR_MESSAGES = {
    MISSING_FIELDS: 'Missing required fields',
    SHOP_NOT_FOUND: 'Shop not found',
    BRANCH_NOT_FOUND: 'Branch not found for shop',
    ITEM_NOT_FOUND: 'Item not found',
    CATEGORY_NOT_FOUND: 'Category total item not found',
    USER_NOT_FOUND: 'User not found in system',
    INVALID_MODE: 'Invalid mode. Use either: (item + company) for item mode, or (no item) for category mode',
    ITEM_MODE_NO_AMOUNT: 'Item mode: do not send amount. Items are just marked as available.',
    CATEGORY_MODE_AMOUNT_REQUIRED: 'Category mode: amount is required (can be 0 or any positive number)',
    CATEGORY_MODE_NEGATIVE: 'Category mode: amount cannot be negative',
    CANNOT_DELETE_CATEGORY: 'Cannot delete category totals. Use POST with amount to update category totals.'
};

// Success messages
const SUCCESS_MESSAGES = {
    ITEM_ADDED: (item, company, shop, branch) => `Item "${item}" (${company}) ADDED to ${shop} - ${branch} ✓`,
    ITEM_UPDATED: (item, company, shop, branch) => `Item "${item}" (${company}) UPDATED in ${shop} - ${branch} ✓`,
    ITEM_DELETED: (item, company, shop, branch) => `Item "${item}" (${company}) DELETED from ${shop} - ${branch}`,
    CATEGORY_SET: (category, amount, shop, branch) => {
        if (amount === 0) {
            return `Category "${category}" total set to 0 (no items) in ${shop} - ${branch}`;
        }
        return `Category "${category}" total set to ${amount} items in ${shop} - ${branch}`;
    },
    CATEGORY_UPDATED: (category, amount, shop, branch) => {
        if (amount === 0) {
            return `Category "${category}" total UPDATED to 0 (no items) in ${shop} - ${branch}`;
        }
        return `Category "${category}" total UPDATED to ${amount} items in ${shop} - ${branch}`;
    }
};

// Database table names (for future reference)
const TABLES = {
    SHOPS: 'shops',
    BRANCHES: 'branches',
    PRODUCT_CATEGORIES: 'product_categories',
    COMPANIES: 'companies',
    ITEMS: 'items',
    USERS: 'users',
    INVENTORY_ENTRIES: 'inventory_entries'
};

module.exports = {
    USER_ID,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    TABLES
};