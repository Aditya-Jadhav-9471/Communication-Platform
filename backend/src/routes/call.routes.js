const express = require('express');
const router = express.Router();
const { getCallHistory } = require('../controllers/call.controller');

router.get('/', getCallHistory);
module.exports = router;