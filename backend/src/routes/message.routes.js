const router = require('express').Router();
const { sendMessage, markSeen, deleteMessage, fetchMessages, editMessage } = require('../controllers/message.controller');

// Define the routes and their associated controller functions
router.post('/', sendMessage);  // Handle sending message
router.patch('/seen', markSeen);  // Handle marking message as seen
router.delete('/:messageId', deleteMessage); // Handle deleting a message
router.get('/messages',fetchMessages);  // Handle fetching messages for a channel
router.patch('/', editMessage); // Handle editing message

module.exports = router;
