const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create or update prediction
router.post('/', authenticateToken, (req, res) => {
  try {
    const {
      pool_id,
      event_id,
      first_place_id,
      second_place_id,
      third_place_id,
      predicted_time,
      world_record_prediction
    } = req.body;

    if (!pool_id || !event_id) {
      return res.status(400).json({ error: 'Pool and event are required' });
    }

    // Check if user is member of pool
    const isMember = db.prepare('SELECT * FROM pool_members WHERE pool_id = ? AND user_id = ?')
      .get(pool_id, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this pool' });
    }

    // Check if event deadline hasn't passed
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(event_id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const now = new Date();
    const deadline = new Date(event.deadline);
    if (now >= deadline) {
      return res.status(400).json({ error: 'Prediction deadline has passed' });
    }

    // Check if this sport is in the pool
    const sportInPool = db.prepare(`
      SELECT 1 FROM pool_sports ps
      JOIN events e ON e.sport_id = ps.sport_id
      WHERE ps.pool_id = ? AND e.id = ?
    `).get(pool_id, event_id);

    if (!sportInPool) {
      return res.status(400).json({ error: 'This sport is not included in this pool' });
    }

    // Check for existing prediction
    const existing = db.prepare(
      'SELECT id FROM predictions WHERE user_id = ? AND pool_id = ? AND event_id = ?'
    ).get(req.user.id, pool_id, event_id);

    if (existing) {
      // Update existing prediction
      db.prepare(`
        UPDATE predictions SET
          first_place_id = ?,
          second_place_id = ?,
          third_place_id = ?,
          predicted_time = ?,
          world_record_prediction = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        first_place_id || null,
        second_place_id || null,
        third_place_id || null,
        predicted_time || null,
        world_record_prediction ? 1 : 0,
        existing.id
      );

      res.json({ message: 'Prediction updated', prediction_id: existing.id });
    } else {
      // Create new prediction
      const result = db.prepare(`
        INSERT INTO predictions (
          user_id, pool_id, event_id, first_place_id, second_place_id, third_place_id,
          predicted_time, world_record_prediction
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user.id,
        pool_id,
        event_id,
        first_place_id || null,
        second_place_id || null,
        third_place_id || null,
        predicted_time || null,
        world_record_prediction ? 1 : 0
      );

      // Update user stats
      db.prepare('UPDATE user_stats SET total_predictions = total_predictions + 1 WHERE user_id = ?')
        .run(req.user.id);

      // Check if this is first prediction - award trophy
      const stats = db.prepare('SELECT total_predictions FROM user_stats WHERE user_id = ?')
        .get(req.user.id);
      if (stats.total_predictions === 1) {
        // Award "First Blood" trophy
        const trophyExists = db.prepare(
          'SELECT 1 FROM user_trophies WHERE user_id = ? AND trophy_id = 9'
        ).get(req.user.id);
        if (!trophyExists) {
          db.prepare('INSERT INTO user_trophies (user_id, trophy_id) VALUES (?, 9)')
            .run(req.user.id);
        }
      }

      res.status(201).json({ message: 'Prediction created', prediction_id: result.lastInsertRowid });
    }
  } catch (error) {
    console.error('Create prediction error:', error);
    res.status(500).json({ error: 'Failed to save prediction' });
  }
});

// Get user's predictions for a pool
router.get('/pool/:poolId', authenticateToken, (req, res) => {
  try {
    // Check if user is member
    const isMember = db.prepare('SELECT * FROM pool_members WHERE pool_id = ? AND user_id = ?')
      .get(req.params.poolId, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this pool' });
    }

    const predictions = db.prepare(`
      SELECT p.*,
             e.name as event_name, e.event_date, e.status as event_status,
             s.name as sport_name, s.icon as sport_icon,
             c1.name as first_name, c1.country as first_country,
             c2.name as second_name, c2.country as second_country,
             c3.name as third_name, c3.country as third_country
      FROM predictions p
      JOIN events e ON p.event_id = e.id
      JOIN sports s ON e.sport_id = s.id
      LEFT JOIN competitors c1 ON p.first_place_id = c1.id
      LEFT JOIN competitors c2 ON p.second_place_id = c2.id
      LEFT JOIN competitors c3 ON p.third_place_id = c3.id
      WHERE p.user_id = ? AND p.pool_id = ?
      ORDER BY e.event_date ASC
    `).all(req.user.id, req.params.poolId);

    res.json(predictions);
  } catch (error) {
    console.error('Get predictions error:', error);
    res.status(500).json({ error: 'Failed to get predictions' });
  }
});

// Get all predictions for an event (only after deadline)
router.get('/event/:eventId/pool/:poolId', authenticateToken, (req, res) => {
  try {
    const { eventId, poolId } = req.params;

    // Check if user is member
    const isMember = db.prepare('SELECT * FROM pool_members WHERE pool_id = ? AND user_id = ?')
      .get(poolId, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this pool' });
    }

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const now = new Date();
    const deadline = new Date(event.deadline);

    // Before deadline, only show user's own prediction
    if (now < deadline) {
      const ownPrediction = db.prepare(`
        SELECT p.*,
               u.nickname, u.profile_image,
               c1.name as first_name, c2.name as second_name, c3.name as third_name
        FROM predictions p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN competitors c1 ON p.first_place_id = c1.id
        LEFT JOIN competitors c2 ON p.second_place_id = c2.id
        LEFT JOIN competitors c3 ON p.third_place_id = c3.id
        WHERE p.event_id = ? AND p.pool_id = ? AND p.user_id = ?
      `).get(eventId, poolId, req.user.id);

      return res.json({
        deadline_passed: false,
        predictions: ownPrediction ? [ownPrediction] : []
      });
    }

    // After deadline, show all predictions
    const predictions = db.prepare(`
      SELECT p.*,
             u.id as user_id, u.nickname, u.profile_image,
             c1.name as first_name, c1.country as first_country,
             c2.name as second_name, c2.country as second_country,
             c3.name as third_name, c3.country as third_country
      FROM predictions p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN competitors c1 ON p.first_place_id = c1.id
      LEFT JOIN competitors c2 ON p.second_place_id = c2.id
      LEFT JOIN competitors c3 ON p.third_place_id = c3.id
      WHERE p.event_id = ? AND p.pool_id = ?
      ORDER BY p.points_earned DESC
    `).all(eventId, poolId);

    res.json({
      deadline_passed: true,
      predictions
    });
  } catch (error) {
    console.error('Get event predictions error:', error);
    res.status(500).json({ error: 'Failed to get predictions' });
  }
});

// Delete prediction (only before deadline)
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const prediction = db.prepare(`
      SELECT p.*, e.deadline
      FROM predictions p
      JOIN events e ON p.event_id = e.id
      WHERE p.id = ? AND p.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!prediction) {
      return res.status(404).json({ error: 'Prediction not found' });
    }

    const now = new Date();
    const deadline = new Date(prediction.deadline);
    if (now >= deadline) {
      return res.status(400).json({ error: 'Cannot delete prediction after deadline' });
    }

    db.prepare('DELETE FROM predictions WHERE id = ?').run(req.params.id);

    res.json({ message: 'Prediction deleted' });
  } catch (error) {
    console.error('Delete prediction error:', error);
    res.status(500).json({ error: 'Failed to delete prediction' });
  }
});

module.exports = router;
