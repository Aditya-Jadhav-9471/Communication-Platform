const express = require('express');
const { listUsers, getCurrentUser, getProfile, updateProfile, uploadAvatar } = require('../controllers/user.controller');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.get('/', listUsers);
router.get('/me', authenticateToken, getCurrentUser);
router.get('/profile', authenticateToken, getProfile);
router.post('/profile', authenticateToken, updateProfile);
router.post('/avatar',authenticateToken, upload.single('avatar'), uploadAvatar);

module.exports = router;