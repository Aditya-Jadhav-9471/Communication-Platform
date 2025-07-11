const express = require('express');
const router = express.Router();
const { 
  generateInviteLink,
  regenerateInviteLink,
  acceptInvite
} = require('../controllers/invite.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Public
router.get('/channels/:channelId/invite-link', generateInviteLink);
router.post('/channels/:channelId/invite-link/regenerate', regenerateInviteLink);

// Protected
router.post('/:token/accept', authenticateToken, acceptInvite);
module.exports = router;