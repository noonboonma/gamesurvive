// migration/init.js
// สคริปต์สร้างตารางอัตโนมัติ — จะรันทุกครั้งที่ server เริ่มต้น
// ใช้ IF NOT EXISTS เพื่อไม่ให้ error ถ้าตารางมีอยู่แล้ว

async function runMigrations(pool) {
    console.log('🔄 Running database migrations...');

    try {
        // ตาราง users — เก็บข้อมูลสมาชิก
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(255) PRIMARY KEY,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Table "users" is ready.');

        // เพิ่มตารางใหม่ได้ที่นี่ในอนาคต
        // await pool.query(`CREATE TABLE IF NOT EXISTS ...`);

        console.log('✅ All migrations completed successfully!');
    } catch (err) {
        console.error('❌ Migration Error:', err.message);
        throw err; // ให้ server หยุดถ้า migration ล้มเหลว
    }
}

module.exports = { runMigrations };
