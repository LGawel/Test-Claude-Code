const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all pools for current user
router.get('/my-pools', authenticateToken, (req, res) => {
  try {
    const pools = db.prepare(`
      SELECT p.*,
             u.nickname as creator_name,
             t.name as tournament_name,
             (SELECT COUNT(*) FROM pool_members WHERE pool_id = p.id) as member_count
      FROM pools p
      JOIN pool_members pm ON p.id = pm.pool_id
      JOIN users u ON p.created_by = u.id
      JOIN tournaments t ON p.tournament_id = t.id
      WHERE pm.user_id = ?
      ORDER BY p.created_at DESC
    `).all(req.user.id);

    // Get sports for each pool
    pools.forEach(pool => {
      pool.sports = db.prepare(`
        SELECT s.id, s.name, s.icon
        FROM sports s
        JOIN pool_sports ps ON s.id = ps.sport_id
        WHERE ps.pool_id = ?
      `).all(pool.id);
    });

    res.json(pools);
  } catch (error) {
    console.error('Get my pools error:', error);
    res.status(500).json({ error: 'Failed to get pools' });
  }
});

// Get pool by ID
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const pool = db.prepare(`
      SELECT p.*,
             u.nickname as creator_name,
             t.name as tournament_name, t.start_date, t.end_date, t.location
      FROM pools p
      JOIN users u ON p.created_by = u.id
      JOIN tournaments t ON p.tournament_id = t.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!pool) {
      return res.status(404).json({ error: 'Pool not found' });
    }

    // Check if user is member
    const isMember = db.prepare('SELECT * FROM pool_members WHERE pool_id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);

    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this pool' });
    }

    // Get members
    pool.members = db.prepare(`
      SELECT u.id, u.nickname, u.profile_image, pm.has_paid, pm.joined_at
      FROM users u
      JOIN pool_members pm ON u.id = pm.user_id
      WHERE pm.pool_id = ?
      ORDER BY pm.joined_at ASC
    `).all(req.params.id);

    // Get sports
    pool.sports = db.prepare(`
      SELECT s.id, s.name, s.icon
      FROM sports s
      JOIN pool_sports ps ON s.id = ps.sport_id
      WHERE ps.pool_id = ?
    `).all(req.params.id);

    // Get upcoming events for this pool's sports
    pool.upcoming_events = db.prepare(`
      SELECT e.*, s.name as sport_name, s.icon as sport_icon
      FROM events e
      JOIN sports s ON e.sport_id = s.id
      JOIN pool_sports ps ON s.id = ps.sport_id
      WHERE ps.pool_id = ? AND e.tournament_id = ? AND e.event_date > datetime('now')
      ORDER BY e.event_date ASC
      LIMIT 10
    `).all(req.params.id, pool.tournament_id);

    res.json(pool);
  } catch (error) {
    console.error('Get pool error:', error);
    res.status(500).json({ error: 'Failed to get pool' });
  }
});

// Create new pool
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, description, tournament_id, entry_fee, sport_ids } = req.body;

    if (!name || !tournament_id) {
      return res.status(400).json({ error: 'Name and tournament are required' });
    }

    if (!sport_ids || sport_ids.length === 0) {
      return res.status(400).json({ error: 'At least one sport must be selected' });
    }

    // Generate unique invite code
    const inviteCode = uuidv4().substring(0, 8).toUpperCase();

    // Create pool
    const result = db.prepare(`
      INSERT INTO pools (name, description, invite_code, tournament_id, created_by, entry_fee, prize_pool)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, description || '', inviteCode, tournament_id, req.user.id, entry_fee || 0, entry_fee || 0);

    const poolId = result.lastInsertRowid;

    // Add sports to pool
    const addSport = db.prepare('INSERT INTO pool_sports (pool_id, sport_id) VALUES (?, ?)');
    sport_ids.forEach(sportId => {
      addSport.run(poolId, sportId);
    });

    // Add creator as member
    db.prepare('INSERT INTO pool_members (pool_id, user_id, has_paid) VALUES (?, ?, 1)')
      .run(poolId, req.user.id);

    res.status(201).json({
      message: 'Pool created successfully',
      pool: {
        id: poolId,
        name,
        invite_code: inviteCode,
        entry_fee: entry_fee || 0
      }
    });
  } catch (error) {
    console.error('Create pool error:', error);
    res.status(500).json({ error: 'Failed to create pool' });
  }
});

// Join pool by invite code
router.post('/join/:inviteCode', authenticateToken, (req, res) => {
  try {
    const { inviteCode } = req.params;

    // Find pool
    const pool = db.prepare('SELECT * FROM pools WHERE invite_code = ?').get(inviteCode.toUpperCase());
    if (!pool) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    // Check if already member
    const existingMember = db.prepare('SELECT * FROM pool_members WHERE pool_id = ? AND user_id = ?')
      .get(pool.id, req.user.id);
    if (existingMember) {
      return res.status(400).json({ error: 'You are already a member of this pool' });
    }

    // Check member limit
    const memberCount = db.prepare('SELECT COUNT(*) as count FROM pool_members WHERE pool_id = ?')
      .get(pool.id).count;
    if (memberCount >= pool.max_members) {
      return res.status(400).json({ error: 'This pool is full' });
    }

    // Add member
    db.prepare('INSERT INTO pool_members (pool_id, user_id) VALUES (?, ?)')
      .run(pool.id, req.user.id);

    // Update prize pool
    if (pool.entry_fee > 0) {
      db.prepare('UPDATE pools SET prize_pool = prize_pool + ? WHERE id = ?')
        .run(pool.entry_fee, pool.id);
    }

    res.json({
      message: 'Successfully joined pool',
      pool: {
        id: pool.id,
        name: pool.name
      }
    });
  } catch (error) {
    console.error('Join pool error:', error);
    res.status(500).json({ error: 'Failed to join pool' });
  }
});

// Get pool info by invite code (for preview before joining)
router.get('/invite/:inviteCode', authenticateToken, (req, res) => {
  try {
    const pool = db.prepare(`
      SELECT p.id, p.name, p.description, p.entry_fee, p.max_members,
             t.name as tournament_name,
             u.nickname as creator_name,
             (SELECT COUNT(*) FROM pool_members WHERE pool_id = p.id) as member_count
      FROM pools p
      JOIN tournaments t ON p.tournament_id = t.id
      JOIN users u ON p.created_by = u.id
      WHERE p.invite_code = ?
    `).get(req.params.inviteCode.toUpperCase());

    if (!pool) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    // Get sports
    pool.sports = db.prepare(`
      SELECT s.name, s.icon
      FROM sports s
      JOIN pool_sports ps ON s.id = ps.sport_id
      WHERE ps.pool_id = ?
    `).all(pool.id);

    // Check if user is already member
    const isMember = db.prepare('SELECT * FROM pool_members WHERE pool_id = ? AND user_id = ?')
      .get(pool.id, req.user.id);
    pool.is_member = !!isMember;

    res.json(pool);
  } catch (error) {
    console.error('Get invite info error:', error);
    res.status(500).json({ error: 'Failed to get pool info' });
  }
});

// Update payment status
router.put('/:id/payment/:userId', authenticateToken, (req, res) => {
  try {
    const { id, userId } = req.params;
    const { has_paid } = req.body;

    // Check if user is pool creator
    const pool = db.prepare('SELECT created_by FROM pools WHERE id = ?').get(id);
    if (!pool || pool.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Only the pool creator can update payment status' });
    }

    db.prepare('UPDATE pool_members SET has_paid = ? WHERE pool_id = ? AND user_id = ?')
      .run(has_paid ? 1 : 0, id, userId);

    res.json({ message: 'Payment status updated' });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

// Leave pool
router.delete('/:id/leave', authenticateToken, (req, res) => {
  try {
    const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
    if (!pool) {
      return res.status(404).json({ error: 'Pool not found' });
    }

    // Creator cannot leave
    if (pool.created_by === req.user.id) {
      return res.status(400).json({ error: 'Pool creator cannot leave. Transfer ownership or delete the pool.' });
    }

    db.prepare('DELETE FROM pool_members WHERE pool_id = ? AND user_id = ?')
      .run(req.params.id, req.user.id);

    res.json({ message: 'Successfully left pool' });
  } catch (error) {
    console.error('Leave pool error:', error);
    res.status(500).json({ error: 'Failed to leave pool' });
  }
});

// Get all sports
router.get('/sports/all', (req, res) => {
  try {
    const sports = db.prepare('SELECT * FROM sports').all();
    res.json(sports);
  } catch (error) {
    console.error('Get sports error:', error);
    res.status(500).json({ error: 'Failed to get sports' });
  }
});

// Get all tournaments
router.get('/tournaments/all', (req, res) => {
  try {
    const tournaments = db.prepare('SELECT * FROM tournaments WHERE is_active = 1').all();
    res.json(tournaments);
  } catch (error) {
    console.error('Get tournaments error:', error);
    res.status(500).json({ error: 'Failed to get tournaments' });
  }
});

module.exports = router;
