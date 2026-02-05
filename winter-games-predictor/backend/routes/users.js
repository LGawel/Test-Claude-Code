const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for profile image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'profiles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Get current user profile
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = getDb().prepare(`
      SELECT u.id, u.email, u.nickname, u.profile_image, u.created_at,
             us.total_predictions, us.correct_predictions, us.total_points,
             us.pools_won, us.longest_streak, us.current_streak, us.perfect_predictions
      FROM users u
      LEFT JOIN user_stats us ON u.id = us.user_id
      WHERE u.id = ?
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's pools
    const pools = getDb().prepare(`
      SELECT p.id, p.name, pm.joined_at
      FROM pools p
      JOIN pool_members pm ON p.id = pm.pool_id
      WHERE pm.user_id = ?
    `).all(req.user.id);

    // Get user's trophies
    const trophies = getDb().prepare(`
      SELECT t.id, t.name, t.description, t.icon, ut.earned_at
      FROM trophies t
      JOIN user_trophies ut ON t.id = ut.trophy_id
      WHERE ut.user_id = ?
      ORDER BY ut.earned_at DESC
    `).all(req.user.id);

    res.json({
      ...user,
      pools,
      trophies
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update profile
router.put('/me', authenticateToken, (req, res) => {
  try {
    const { nickname } = req.body;

    if (nickname) {
      // Check if nickname is taken by another user
      const existing = getDb().prepare('SELECT id FROM users WHERE nickname = ? AND id != ?').get(nickname, req.user.id);
      if (existing) {
        return res.status(400).json({ error: 'Nickname already taken' });
      }

      getDb().prepare('UPDATE users SET nickname = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(nickname, req.user.id);
    }

    const updatedUser = getDb().prepare('SELECT id, email, nickname, profile_image FROM users WHERE id = ?')
      .get(req.user.id);

    res.json({ message: 'Profile updated', user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Upload profile image
router.post('/me/avatar', authenticateToken, upload.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imageUrl = `/uploads/profiles/${req.file.filename}`;

    // Delete old profile image if exists
    const user = getDb().prepare('SELECT profile_image FROM users WHERE id = ?').get(req.user.id);
    if (user.profile_image) {
      const oldPath = path.join(__dirname, '..', user.profile_image);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    getDb().prepare('UPDATE users SET profile_image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(imageUrl, req.user.id);

    res.json({ message: 'Profile image updated', imageUrl });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Failed to upload profile image' });
  }
});

// Get user by ID (public profile)
router.get('/:id', (req, res) => {
  try {
    const user = getDb().prepare(`
      SELECT u.id, u.nickname, u.profile_image, u.created_at,
             us.total_predictions, us.correct_predictions, us.total_points,
             us.pools_won, us.longest_streak, us.perfect_predictions
      FROM users u
      LEFT JOIN user_stats us ON u.id = us.user_id
      WHERE u.id = ?
    `).get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's trophies
    const trophies = getDb().prepare(`
      SELECT t.id, t.name, t.description, t.icon, ut.earned_at
      FROM trophies t
      JOIN user_trophies ut ON t.id = ut.trophy_id
      WHERE ut.user_id = ?
      ORDER BY ut.earned_at DESC
    `).all(req.params.id);

    res.json({ ...user, trophies });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Get user's prediction history
router.get('/:id/history', (req, res) => {
  try {
    const predictions = getDb().prepare(`
      SELECT p.id, p.points_earned, p.created_at,
             e.name as event_name, e.event_date,
             s.name as sport_name,
             c1.name as predicted_first, c2.name as predicted_second, c3.name as predicted_third,
             pool.name as pool_name
      FROM predictions p
      JOIN events e ON p.event_id = e.id
      JOIN sports s ON e.sport_id = s.id
      JOIN pools pool ON p.pool_id = pool.id
      LEFT JOIN competitors c1 ON p.first_place_id = c1.id
      LEFT JOIN competitors c2 ON p.second_place_id = c2.id
      LEFT JOIN competitors c3 ON p.third_place_id = c3.id
      WHERE p.user_id = ?
      ORDER BY e.event_date DESC
      LIMIT 50
    `).all(req.params.id);

    res.json(predictions);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get prediction history' });
  }
});

module.exports = router;
