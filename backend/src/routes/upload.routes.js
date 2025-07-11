const express = require('express');
const router = express.Router();
const upload = require('../config/upload');
const Channel = require('../models/Channel');
const { getIO } = require('../services/socketio.service');

router.post(
  '/channels/:channelId/upload',
  upload.array('attachments', 5),
  async (req, res) => {
    try {
      const { channelId } = req.params;
      const userId = req.user.id;

      const channel = await Channel.findOne({ _id: channelId, users: userId });
      if (!channel) {
        return res.status(403).json({ error: 'Unauthorized or invalid channel' });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const publicUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
      const uploadedFiles = req.files.map((file) => {
        const fileUrl = `${publicUrl}/uploads/${file.filename}`;
        console.log(`Generated file URL: ${fileUrl}`); // Debug log
        return {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: file.mimetype.startsWith('image/') ? 'image' : 'file',
          name: file.originalname,
          url: fileUrl,
          size: file.size,
        };
      });

      const io = getIO();
      io.to(channelId).emit('filesUploaded', { channelId, uploadedFiles });

      res.status(200).json({ channelId, uploadedFiles });
    } catch (error) {
      console.error('Error uploading files:', error.message, error.stack);
      res.status(500).json({ error: 'Failed to upload files' });
    }
  }
);

module.exports = router;