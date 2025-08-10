// Test all GET endpoints
const BASE_URL = 'http://localhost:3000/api';

const endpoints = [
    { name: 'Health Check', url: '/health' },
    { name: 'Database Stats', url: '/stats' },
    { name: 'All Shops', url: '/shops' },
    { name: 'All Branches', url: '/branches' },
    { name: 'ALM Branches', url: '/branches/ALM' },
    { name: 'Product Categories', url: '/product-categories' },
    { name: 'Companies', url: '/companies' },
    { name: 'REF Items', url: '/items?productCategory=REF' },
    { name: 'LG REF Items', url: '/items?productCategory=REF&company=LG' },
    { name: 'Verify Item (exists)', url: '/verify-item/GR-X920INS' },
    { name: 'Verify Item (not exists)', url: '/verify-item/FAKE-ITEM' },
    { name: 'Search Items GR', url: '/search-items/GR' },
    { name: 'Inventory Summary', url: '/inventory-summary' },
    { name: 'Inventory Entries', url: '/inventory-entries?limit=3' },
    { name: 'Daily Report', url: '/reports/inventory-by-date?groupBy=day' },
];

async function testEndpoint(name, url) {
    try {
        console.log(`\n🧪 Testing: ${name}`);
        console.log(`📡 URL: ${BASE_URL}${url}`);
        
        const response = await fetch(`${BASE_URL}${url}`);
        const data = await response.json();
        
        if (response.ok) {
            console.log(`✅ Status: ${response.status}`);
            
            // Show sample of response
            if (Array.isArray(data)) {
                console.log(`📊 Count: ${data.length} items`);
                if (data.length > 0) {
                    console.log(`📋 Sample:`, JSON.stringify(data[0], null, 2));
                }
            } else {
                console.log(`📋 Response:`, JSON.stringify(data, null, 2));
            }
        } else {
            console.log(`❌ Status: ${response.status}`);
            console.log(`💥 Error:`, data);
        }
        
    } catch (error) {
        console.log(`💥 Network Error:`, error.message);
    }
}

async function testAllEndpoints() {
    console.log('🚀 Starting API Endpoint Tests...');
    console.log('=' .repeat(50));
    
    for (const endpoint of endpoints) {
        await testEndpoint(endpoint.name, endpoint.url);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 All tests completed!');
}



// Run tests
testAllEndpoints().catch(console.error);

// HOW TO USE:
// 1. Save this as 'test-endpoints.js'
// 2. Make sure your server is running: npm start
// 3. Run: node test-endpoints.js