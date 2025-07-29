const { pool } = require('./config/database');
const fs = require('fs');

async function importData() {
    const connection = await pool.getConnection();
    
    try {
        console.log('🔄 Starting smart import to Railway database...');
        console.log('📊 Target database: railway');
        
        // Принудительно использовать railway базу
        await connection.execute('USE railway');
        console.log('✅ Connected to railway database');
        
        // Отключить constraints для безопасного импорта
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        await connection.execute('SET UNIQUE_CHECKS = 0');
        await connection.execute('SET AUTOCOMMIT = 0');
        console.log('🔧 Disabled constraints and autocommit');
        
        // Прочитать SQL файл
        console.log('📖 Reading lg_db.sql file...');
        const sql = fs.readFileSync('./lg_db.sql', 'utf8');
        
        // Очистить SQL от проблемных команд
        console.log('🧹 Cleaning SQL statements...');
        let cleanSql = sql
            .replace(/USE\s+\w+\s*;/gi, '')  // Убрать все USE statements
            .replace(/CREATE DATABASE[^;]*;/gi, '')  // Убрать CREATE DATABASE
            .replace(/DROP DATABASE[^;]*;/gi, '');   // Убрать DROP DATABASE
        
        // Разделить на отдельные команды
        const statements = cleanSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
        
        console.log(`📝 Found ${statements.length} SQL statements to execute`);
        
        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;
        
        // Выполнить каждую команду
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            if (statement && !statement.toUpperCase().startsWith('USE')) {
                try {
                    await connection.execute(statement);
                    successCount++;
                    console.log(`✅ ${i + 1}/${statements.length}: OK`);
                } catch (error) {
                    if (error.message.includes('already exists') || 
                        error.message.includes('Duplicate entry')) {
                        skipCount++;
                        console.log(`⏭️  ${i + 1}/${statements.length}: Skipped (already exists)`);
                    } else {
                        errorCount++;
                        console.log(`⚠️  ${i + 1}/${statements.length}: Error - ${error.message}`);
                    }
                }
            }
        }
        
        // Зафиксировать изменения
        await connection.execute('COMMIT');
        console.log('💾 Changes committed');
        
        // Включить constraints обратно
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        await connection.execute('SET UNIQUE_CHECKS = 1');
        await connection.execute('SET AUTOCOMMIT = 1');
        console.log('🔧 Re-enabled constraints and autocommit');
        
        // Проверка результата импорта
        console.log('\n📊 Verifying imported data...');
        
        const tables = ['shops', 'branches', 'product_categories', 'companies', 'items', 'users', 'inventory_entries'];
        
        for (const table of tables) {
            try {
                const [result] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`   📋 ${table}: ${result[0].count} records`);
            } catch (error) {
                console.log(`   ❌ ${table}: Table not found or error`);
            }
        }
        
        // Статистика импорта
        console.log('\n🎉 Import completed!');
        console.log(`   ✅ Successful: ${successCount} statements`);
        console.log(`   ⏭️  Skipped: ${skipCount} statements`);
        console.log(`   ⚠️  Errors: ${errorCount} statements`);
        
        if (successCount > 0) {
            console.log('\n🚀 Database is ready! You can now test your API:');
            console.log('   curl https://lg-inventory-server-production.up.railway.app/api/shops');
            console.log('   curl https://lg-inventory-server-production.up.railway.app/api/stats');
        }
        
    } catch (error) {
        console.error('\n❌ Import failed with critical error:');
        console.error('   Error:', error.message);
        console.error('   Rolling back changes...');
        
        try {
            await connection.execute('ROLLBACK');
            console.log('✅ Rollback completed');
        } catch (rollbackError) {
            console.error('❌ Rollback failed:', rollbackError.message);
        }
    } finally {
        connection.release();
        console.log('\n🔌 Database connection closed');
        process.exit(0);
    }
}

// Проверить доступность файла перед запуском
if (!fs.existsSync('./lg_db.sql')) {
    console.error('❌ File lg_db.sql not found in current directory!');
    console.log('💡 Make sure lg_db.sql is in the same folder as this script');
    process.exit(1);
}

console.log('🎯 Smart Railway Data Import Tool');
console.log('=====================================');
console.log('📁 SQL File: ./lg_db.sql');
console.log('🎯 Target: Railway database');
console.log('🔧 Features: Auto-clean, constraint handling, verification');
console.log('=====================================\n');

importData();