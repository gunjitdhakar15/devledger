const userModel = require('../models/userModel');
async function listUsers(req, res) {
    try {
        const users = await userModel.getAllUsers();
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
}
module.exports = { listUsers };
