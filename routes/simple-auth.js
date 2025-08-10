const express = require('express');
const { pool } = require('../config/database');

const router = express.Router();

// Simple login - no password hashing, plain text comparison
router.post('/simple-login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        
        console.log(`🔍 Login attempt - Username: "${username}", Password: "${password}"`);
        
        // Find user in database
        const [users] = await pool.execute(
            'SELECT id, name, username, password FROM users WHERE username = ? AND is_active = 1',
            [username]
        );
        
        console.log(`📊 Found ${users.length} users for username: ${username}`);
        
        if (users.length === 0) {
            console.log(`❌ User not found: ${username}`);
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        const user = users[0];
        console.log(`👤 User found: ${user.name} (ID: ${user.id})`);
        console.log(`🔑 Stored password: "${user.password}"`);
        console.log(`🔑 Provided password: "${password}"`);
        
        // Simple password comparison (plain text)
        if (user.password !== password) {
            console.log(`❌ Password mismatch for user: ${username}`);
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        console.log(`✅ Login successful for user: ${username}`);
        
        // Return user info (no password)
        res.json({
            user: {
                id: user.id,
                name: user.name,
                username: user.username
            }
        });
        
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

module.exports = router;