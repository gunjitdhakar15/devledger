const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getMe } = require('../controllers/userController');

const router = express.Router();

// Protected route to get your own profile
router.get('/me', protect, getMe);

module.exports = router;
