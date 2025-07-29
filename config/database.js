const mysql = require('mysql2/promise');

// Debug environment variables FIRST
console.log('🔍 Environment Variables Debug:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_HOST:', process.env.DB_HOST || 'NOT SET');
console.log('DB_USER:', process.env.DB_USER || 'NOT SET');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');
console.log('DB_NAME:', process.env.DB_NAME || 'NOT SET');
console.log('DB_PORT:', process.env.DB_PORT || 'NOT SET');

// Show ALL environment variables that start with DB_ or MYSQL
console.log('🔍 All DB/MYSQL Environment Variables:');
Object.keys(process.env)
    .filter(key => key.startsWith('DB_') || key.startsWith('MYSQL'))
    .forEach(key => {
        const value = key.includes('PASSWORD') ? '***HIDDEN***' : process.env[key];
        console.log(`${key}: ${value}`);
    });

// MySQL connection configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root', 
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lg',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

console.log('📊 Final Database Config:');
console.log('Host:', dbConfig.host);
console.log('User:', dbConfig.user);
console.log('Database:', dbConfig.database);
console.log('Port:', dbConfig.port);
console.log('Password:', dbConfig.password ? '***SET***' : 'NOT SET');

// Create MySQL connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
    try {
        console.log('🔄 Attempting database connection...');
        const connection = await pool.getConnection();
        console.log('✅ Connected to MySQL database successfully');
        connection.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('❌ Full error:', error);
        // Don't exit in production, let the app run
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
    }
}

module.exports = {
    pool,
    testConnection
};