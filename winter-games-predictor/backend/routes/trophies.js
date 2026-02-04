const express = require('express');
const db = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get all available trophies
router.get('/', optionalAuth, (req, res) => {
  try {
    const trophies = db.prepare('SELECT * FROM trophies ORDER BY id').all();
    res.json(trophies);
  } catch (error) {
    console.error('Get trophies error:', error);
    res.status(500).json({ error: 'Failed to get trophies' });
  }
});

// Get user's trophies (bekerkast)
router.get('/user/:userId', optionalAuth, (req, res) => {
  try {
    const trophies = db.prepare(`
      SELECT t.*, ut.earned_at, ut.pool_id, ut.tournament_id,
             p.name as pool_name,
             trn.name as tournament_name
      FROM trophies t
      JOIN user_trophies ut ON t.id = ut.trophy_id
      LEFT JOIN pools p ON ut.pool_id = p.id
      LEFT JOIN tournaments trn ON ut.tournament_id = trn.id
      WHERE ut.user_id = ?
      ORDER BY ut.earned_at DESC
    `).all(req.params.userId);

    // Group by trophy type for display
    const grouped = {
      pool_wins: trophies.filter(t => t.type === 'pool_winner'),
      achievements: trophies.filter(t => !['pool_winner'].includes(t.type)),
      total_count: trophies.length
    };

    // Get trophy counts by type
    const counts = db.prepare(`
      SELECT t.type, COUNT(*) as count
      FROM user_trophies ut
      JOIN trophies t ON ut.trophy_id = t.id
      WHERE ut.user_id = ?
      GROUP BY t.type
    `).all(req.params.userId);

    res.json({
      trophies,
      grouped,
      counts: counts.reduce((acc, c) => ({ ...acc, [c.type]: c.count }), {})
    });
  } catch (error) {
    console.error('Get user trophies error:', error);
    res.status(500).json({ error: 'Failed to get trophies' });
  }
});

// Get trophy details
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const trophy = db.prepare('SELECT * FROM trophies WHERE id = ?').get(req.params.id);

    if (!trophy) {
      return res.status(404).json({ error: 'Trophy not found' });
    }

    // Get users who have this trophy
    const holders = db.prepare(`
      SELECT u.id, u.nickname, u.profile_image, ut.earned_at
      FROM users u
      JOIN user_trophies ut ON u.id = ut.user_id
      WHERE ut.trophy_id = ?
      ORDER BY ut.earned_at DESC
      LIMIT 50
    `).all(req.params.id);

    const totalHolders = db.prepare(
      'SELECT COUNT(*) as count FROM user_trophies WHERE trophy_id = ?'
    ).get(req.params.id).count;

    res.json({
      ...trophy,
      holders,
      total_holders: totalHolders
    });
  } catch (error) {
    console.error('Get trophy error:', error);
    res.status(500).json({ error: 'Failed to get trophy' });
  }
});

// Award trophy to user (internal use / admin)
router.post('/award', authenticateToken, (req, res) => {
  try {
    const { user_id, trophy_id, pool_id, tournament_id } = req.body;

    if (!user_id || !trophy_id) {
      return res.status(400).json({ error: 'User ID and trophy ID are required' });
    }

    // Check if user already has this trophy (for unique trophies)
    const trophy = db.prepare('SELECT * FROM trophies WHERE id = ?').get(trophy_id);
    if (!trophy) {
      return res.status(404).json({ error: 'Trophy not found' });
    }

    // For pool-specific trophies, check if already awarded for this pool
    if (pool_id) {
      const existing = db.prepare(
        'SELECT 1 FROM user_trophies WHERE user_id = ? AND trophy_id = ? AND pool_id = ?'
      ).get(user_id, trophy_id, pool_id);
      if (existing) {
        return res.status(400).json({ error: 'Trophy already awarded for this pool' });
      }
    }

    // Award trophy
    db.prepare(`
      INSERT INTO user_trophies (user_id, trophy_id, pool_id, tournament_id)
      VALUES (?, ?, ?, ?)
    `).run(user_id, trophy_id, pool_id || null, tournament_id || null);

    // Create notification
    db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (?, 'trophy', ?, ?, ?)
    `).run(
      user_id,
      `Nieuwe trofee: ${trophy.name}`,
      trophy.description,
      trophy_id
    );

    res.json({ message: 'Trophy awarded successfully' });
  } catch (error) {
    console.error('Award trophy error:', error);
    res.status(500).json({ error: 'Failed to award trophy' });
  }
});

// Check and award trophies based on stats (can be called periodically)
router.post('/check/:userId', authenticateToken, (req, res) => {
  try {
    const userId = req.params.userId;

    // Only allow users to check their own trophies
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Can only check your own trophies' });
    }

    const stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(userId);
    if (!stats) {
      return res.status(404).json({ error: 'User stats not found' });
    }

    const awardedTrophies = [];

    // Check streak trophies
    if (stats.longest_streak >= 5) {
      const hasStreakTrophy = db.prepare(
        'SELECT 1 FROM user_trophies WHERE user_id = ? AND trophy_id = 4'
      ).get(userId);
      if (!hasStreakTrophy) {
        db.prepare('INSERT INTO user_trophies (user_id, trophy_id) VALUES (?, 4)').run(userId);
        awardedTrophies.push('Op Dreef (5 streak)');
      }
    }

    if (stats.longest_streak >= 10) {
      const hasStreakTrophy = db.prepare(
        'SELECT 1 FROM user_trophies WHERE user_id = ? AND trophy_id = 5'
      ).get(userId);
      if (!hasStreakTrophy) {
        db.prepare('INSERT INTO user_trophies (user_id, trophy_id) VALUES (?, 5)').run(userId);
        awardedTrophies.push('Onstopbaar (10 streak)');
      }
    }

    // Check perfect prediction trophy
    if (stats.perfect_predictions >= 1) {
      const hasPerfectTrophy = db.prepare(
        'SELECT 1 FROM user_trophies WHERE user_id = ? AND trophy_id = 2'
      ).get(userId);
      if (!hasPerfectTrophy) {
        db.prepare('INSERT INTO user_trophies (user_id, trophy_id) VALUES (?, 2)').run(userId);
        awardedTrophies.push('Perfecte Voorspelling');
      }
    }

    // Check veteran trophy (10+ pools)
    const poolCount = db.prepare(
      'SELECT COUNT(*) as count FROM pool_members WHERE user_id = ?'
    ).get(userId).count;
    if (poolCount >= 10) {
      const hasVeteranTrophy = db.prepare(
        'SELECT 1 FROM user_trophies WHERE user_id = ? AND trophy_id = 10'
      ).get(userId);
      if (!hasVeteranTrophy) {
        db.prepare('INSERT INTO user_trophies (user_id, trophy_id) VALUES (?, 10)').run(userId);
        awardedTrophies.push('Veteraan');
      }
    }

    res.json({
      message: awardedTrophies.length > 0 ? 'New trophies awarded!' : 'No new trophies',
      awarded: awardedTrophies
    });
  } catch (error) {
    console.error('Check trophies error:', error);
    res.status(500).json({ error: 'Failed to check trophies' });
  }
});

module.exports = router;
