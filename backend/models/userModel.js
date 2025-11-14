const pool = require('../config/db');
// Example: Get all users from the 'users' table
async function getAllUsers() {
    const result = await pool.query('SELECT * FROM users');
    return result.rows;
}
module.exports = { getAllUsers };
