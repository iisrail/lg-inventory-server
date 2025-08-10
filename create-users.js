const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function createUsers() {
    try {
        // Connect to database
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '', // your MySQL password
            database: 'lg'
        });
        
        // Hash passwords
        const elishayPass = await bcrypt.hash('password123', 10);
        const adminPass = await bcrypt.hash('admin123', 10);
        
        // Insert users
        await connection.execute(`
            INSERT INTO users (name, username, password_hash, is_active) VALUES 
            ('Elishay Cohen', 'elishay', ?, 1),
            ('Admin User', 'admin', ?, 1)
            ON DUPLICATE KEY UPDATE 
            password_hash = VALUES(password_hash)
        `, [elishayPass, adminPass]);
        
        console.log('✅ Users created successfully!');
        console.log('Login: elishay / password123');
        console.log('Login: admin / admin123');
        
        await connection.end();
        
    } catch (error) {
        console.error('Error:', error);
    }
}

createUsers();