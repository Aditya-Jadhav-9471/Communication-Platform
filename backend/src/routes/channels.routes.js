const express = require('express');
const router = express.Router();
const {
  createChannel,
  listChannels,
  updateChannel,
  deleteChannel
} = require('../controllers/channels.controller');

router.post('/', createChannel);
router.get('/', listChannels)
router.patch('/:channelId', updateChannel)
router.delete('/:channelId', deleteChannel);

module.exports = router;