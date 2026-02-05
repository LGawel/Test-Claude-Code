const express = require('express');
const { getDb } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get pool leaderboard
router.get('/pool/:poolId', authenticateToken, (req, res) => {
  try {
    // Check if user is member
    const isMember = getDb().prepare('SELECT * FROM pool_members WHERE pool_id = ? AND user_id = ?')
      .get(req.params.poolId, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this pool' });
    }

    const leaderboard = getDb().prepare(`
      SELECT
        u.id,
        u.nickname,
        u.profile_image,
        pm.has_paid,
        COALESCE(SUM(p.points_earned), 0) as total_points,
        COUNT(p.id) as predictions_made,
        SUM(CASE WHEN p.points_earned > 0 THEN 1 ELSE 0 END) as correct_predictions
      FROM pool_members pm
      JOIN users u ON pm.user_id = u.id
      LEFT JOIN predictions p ON p.user_id = u.id AND p.pool_id = pm.pool_id
      WHERE pm.pool_id = ?
      GROUP BY u.id
      ORDER BY total_points DESC, correct_predictions DESC
    `).all(req.params.poolId);

    // Add rank
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Get pool info
    const pool = getDb().prepare(`
      SELECT p.name, p.prize_pool, p.entry_fee,
             t.name as tournament_name
      FROM pools p
      JOIN tournaments t ON p.tournament_id = t.id
      WHERE p.id = ?
    `).get(req.params.poolId);

    res.json({
      pool,
      leaderboard
    });
  } catch (error) {
    console.error('Get pool leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Get global leaderboard
router.get('/global', optionalAuth, (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const leaderboard = getDb().prepare(`
      SELECT
        u.id,
        u.nickname,
        u.profile_image,
        us.total_points,
        us.total_predictions,
        us.correct_predictions,
        us.pools_won,
        us.longest_streak,
        us.perfect_predictions
      FROM users u
      JOIN user_stats us ON u.id = us.user_id
      WHERE us.total_predictions > 0
      ORDER BY us.total_points DESC, us.correct_predictions DESC
      LIMIT ? OFFSET ?
    `).all(parseInt(limit), parseInt(offset));

    // Add rank
    leaderboard.forEach((entry, index) => {
      entry.rank = parseInt(offset) + index + 1;
    });

    const totalUsers = getDb().prepare(
      'SELECT COUNT(*) as count FROM user_stats WHERE total_predictions > 0'
    ).get().count;

    res.json({
      leaderboard,
      total: totalUsers,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get global leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Get leaderboard by sport
router.get('/sport/:sportId', optionalAuth, (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const leaderboard = getDb().prepare(`
      SELECT
        u.id,
        u.nickname,
        u.profile_image,
        COALESCE(SUM(p.points_earned), 0) as sport_points,
        COUNT(p.id) as predictions_made
      FROM users u
      JOIN predictions p ON u.id = p.user_id
      JOIN events e ON p.event_id = e.id
      WHERE e.sport_id = ?
      GROUP BY u.id
      HAVING predictions_made > 0
      ORDER BY sport_points DESC
      LIMIT ?
    `).all(req.params.sportId, parseInt(limit));

    // Add rank
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    const sport = getDb().prepare('SELECT * FROM sports WHERE id = ?').get(req.params.sportId);

    res.json({
      sport,
      leaderboard
    });
  } catch (error) {
    console.error('Get sport leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Get user's rank in a pool
router.get('/pool/:poolId/rank/:userId', authenticateToken, (req, res) => {
  try {
    const { poolId, userId } = req.params;

    // Check if user is member
    const isMember = getDb().prepare('SELECT * FROM pool_members WHERE pool_id = ? AND user_id = ?')
      .get(poolId, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this pool' });
    }

    // Get all members sorted by points
    const members = getDb().prepare(`
      SELECT
        pm.user_id,
        COALESCE(SUM(p.points_earned), 0) as total_points
      FROM pool_members pm
      LEFT JOIN predictions p ON p.user_id = pm.user_id AND p.pool_id = pm.pool_id
      WHERE pm.pool_id = ?
      GROUP BY pm.user_id
      ORDER BY total_points DESC
    `).all(poolId);

    const rank = members.findIndex(m => m.user_id === parseInt(userId)) + 1;
    const userStats = members.find(m => m.user_id === parseInt(userId));

    res.json({
      rank,
      total_members: members.length,
      points: userStats?.total_points || 0
    });
  } catch (error) {
    console.error('Get user rank error:', error);
    res.status(500).json({ error: 'Failed to get rank' });
  }
});

module.exports = router;
