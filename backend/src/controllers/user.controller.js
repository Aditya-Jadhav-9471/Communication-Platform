const User = require("../models/User");
const { cloudinary, uploadToCloudinary } = require('../utils/cloudinary');
const { getIO } = require('../services/socketio.service');

// List all users (only username and id)
const listUsers = async (req, res, next) => {
  try {
      const users = await User.find({});
      const sanitizedUsers = users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar?.url,
      }));
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
};

const getCurrentUser = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      console.log('getCurrentUser: No user ID in request', { headers: req.headers });
      return res.status(401).json({ error: 'Authentication required' });
    }
    const user = await User.findById(req.user.id).select('name email avatar');
    if (!user) {
      console.log('getCurrentUser: User not found for ID:', req.user.id);
      return res.status(404).json({ error: "User not found" });
    }
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar?.url,
    });
  } catch (error) {
    console.error('Error in getCurrentUser:', error.message);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

// Get the current user's profile
const getProfile = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      console.log('getProfile: No user ID in request', { headers: req.headers });
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userId = req.user.id;
    const user = await User.findById(userId).select('-password -__v');

    if (!user) {
      console.log('getProfile: User not found for ID:', userId);
      return res.status(404).json({ error: "Profile not found" });
    }

    const profileData = {
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      location: user.location || '',
      occupation: user.position || '',
      joinDate: user.joinDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      bio: user.bio || '',
      socialLinks: {
        twitter: user.socialLinks?.twitter || '',
        github: user.socialLinks?.github || '',
        linkedin: user.socialLinks?.linkedin || ''
      },
      avatar: user.avatar || { public_id: '', url: '' }
    };

    return res.json(profileData);
  } catch (err) {
    console.error('Error in getProfile:', err.message);
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      console.log('updateProfile: No user ID in request', { headers: req.headers });
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userId = req.user.id;
    const {
      name,
      email,
      phone,
      location,
      occupation,
      bio,
      socialLinks,
    } = req.body;

    const updateData = {
      name,
      email,
      phone,
      location,
      position: occupation,
      bio,
      socialLinks,
    };

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, select: '-password -__v' }
    );

    if (!updatedUser) {
      console.log('updateProfile: User not found for ID:', userId);
      return res.status(404).json({ error: "User not found" });
    }

    // Added: Emit user name update event if name has changed
    const io = getIO();
    if (name && name !== req.user.name) {
      io.to(userId).emit('userNameUpdated', { userId, newName: name });
    }

    const profileData = {
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone || '',
      location: updatedUser.location || '',
      occupation: updatedUser.position || '',
      joinDate: updatedUser.joinDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      bio: updatedUser.bio || '',
      socialLinks: {
        twitter: updatedUser.socialLinks?.twitter || '',
        github: updatedUser.socialLinks?.github || '',
        linkedin: updatedUser.socialLinks?.linkedin || ''
      },
      avatar: updatedUser.avatar || { public_id: '', url: '' }
    };

    return res.json(profileData);
  } catch (err) {
    console.error('Error in updateProfile:', err.message);
    next(err);
  }
};

const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }
    if (!req.user || !req.user.id) {
      console.log('uploadAvatar: No user ID in request', { headers: req.headers });
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      console.log('uploadAvatar: User not found for ID:', userId);
      return res.status(404).json({ error: "User not found" });
    }
    if (user.avatar?.public_id) {
      await cloudinary.uploader.destroy(user.avatar.public_id);
    }
    const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
    user.avatar = {
      public_id: result.public_id,
      url: cloudinary.url(result.public_id, {
        width: 200,
        height: 200,
        crop: 'fill',
        quality: 'auto',
        fetch_format: 'auto'
      })
    };
    await user.save();
    res.json({
      avatar: {
        public_id: result.public_id,
        url: user.avatar.url
      }
    });
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({ error: 'Failed to upload image' });
  }
};

module.exports = { listUsers, getCurrentUser, getProfile, updateProfile, uploadAvatar };