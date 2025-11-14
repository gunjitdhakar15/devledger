const express = require('express');
const { listUsers } = require('../controllers/userController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const router = express.Router();

router.get('/users', authenticateToken, authorizeRoles('admin'), listUsers);

module.exports = router;
