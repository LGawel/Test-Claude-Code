const express = require('express');
const { getDb } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get all events for a tournament
router.get('/tournament/:tournamentId', optionalAuth, (req, res) => {
  try {
    const events = getDb().prepare(`
      SELECT e.*, s.name as sport_name, s.icon as sport_icon
      FROM events e
      JOIN sports s ON e.sport_id = s.id
      WHERE e.tournament_id = ?
      ORDER BY e.event_date ASC
    `).all(req.params.tournamentId);

    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Get events for a specific pool (based on selected sports)
router.get('/pool/:poolId', authenticateToken, (req, res) => {
  try {
    // Check if user is member
    const isMember = getDb().prepare('SELECT * FROM pool_members WHERE pool_id = ? AND user_id = ?')
      .get(req.params.poolId, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this pool' });
    }

    const pool = getDb().prepare('SELECT tournament_id FROM pools WHERE id = ?').get(req.params.poolId);
    if (!pool) {
      return res.status(404).json({ error: 'Pool not found' });
    }

    const events = getDb().prepare(`
      SELECT e.*, s.name as sport_name, s.icon as sport_icon,
             CASE WHEN datetime(e.deadline) > datetime('now') THEN 1 ELSE 0 END as can_predict
      FROM events e
      JOIN sports s ON e.sport_id = s.id
      JOIN pool_sports ps ON s.id = ps.sport_id
      WHERE ps.pool_id = ? AND e.tournament_id = ?
      ORDER BY e.event_date ASC
    `).all(req.params.poolId, pool.tournament_id);

    // Get user's predictions for these events
    const predictions = getDb().prepare(`
      SELECT event_id, first_place_id, second_place_id, third_place_id,
             predicted_time, world_record_prediction, points_earned
      FROM predictions
      WHERE user_id = ? AND pool_id = ?
    `).all(req.user.id, req.params.poolId);

    const predictionMap = {};
    predictions.forEach(p => {
      predictionMap[p.event_id] = p;
    });

    events.forEach(event => {
      event.user_prediction = predictionMap[event.id] || null;
    });

    res.json(events);
  } catch (error) {
    console.error('Get pool events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Get single event details
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const event = getDb().prepare(`
      SELECT e.*, s.name as sport_name, s.icon as sport_icon,
             t.name as tournament_name
      FROM events e
      JOIN sports s ON e.sport_id = s.id
      JOIN tournaments t ON e.tournament_id = t.id
      WHERE e.id = ?
    `).get(req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get competitors for this event's sport
    event.competitors = getDb().prepare(`
      SELECT * FROM competitors WHERE sport_id = ?
    `).all(event.sport_id);

    // Get results if available
    event.results = getDb().prepare(`
      SELECT er.*, c.name as competitor_name, c.country, c.country_code
      FROM event_results er
      JOIN competitors c ON er.competitor_id = c.id
      WHERE er.event_id = ?
      ORDER BY er.position ASC
    `).all(req.params.id);

    res.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Failed to get event' });
  }
});

// Get competitors by sport
router.get('/competitors/sport/:sportId', (req, res) => {
  try {
    const competitors = getDb().prepare(`
      SELECT * FROM competitors WHERE sport_id = ?
      ORDER BY name ASC
    `).all(req.params.sportId);

    res.json(competitors);
  } catch (error) {
    console.error('Get competitors error:', error);
    res.status(500).json({ error: 'Failed to get competitors' });
  }
});

// Admin: Add event result (for demo/testing purposes)
router.post('/:id/results', authenticateToken, (req, res) => {
  try {
    const { results } = req.body; // Array of { competitor_id, position, time, is_world_record }

    if (!results || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: 'Results array is required' });
    }

    const event = getDb().prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Clear existing results
    getDb().prepare('DELETE FROM event_results WHERE event_id = ?').run(req.params.id);

    // Insert new results
    const insertResult = getDb().prepare(`
      INSERT INTO event_results (event_id, competitor_id, position, time, is_world_record)
      VALUES (?, ?, ?, ?, ?)
    `);

    let worldRecordBroken = false;
    results.forEach(result => {
      insertResult.run(
        req.params.id,
        result.competitor_id,
        result.position,
        result.time || null,
        result.is_world_record ? 1 : 0
      );
      if (result.is_world_record) worldRecordBroken = true;
    });

    // Update event status
    getDb().prepare(`
      UPDATE events SET status = 'completed', is_world_record_broken = ?
      WHERE id = ?
    `).run(worldRecordBroken ? 1 : 0, req.params.id);

    // Calculate points for all predictions
    calculatePoints(req.params.id);

    res.json({ message: 'Results saved and points calculated' });
  } catch (error) {
    console.error('Add results error:', error);
    res.status(500).json({ error: 'Failed to add results' });
  }
});

// Function to calculate points for predictions
function calculatePoints(eventId) {
  const results = getDb().prepare(`
    SELECT competitor_id, position, is_world_record
    FROM event_results
    WHERE event_id = ?
    ORDER BY position ASC
    LIMIT 3
  `).all(eventId);

  if (results.length < 3) return;

  const first = results.find(r => r.position === 1);
  const second = results.find(r => r.position === 2);
  const third = results.find(r => r.position === 3);
  const worldRecordBroken = results.some(r => r.is_world_record);

  const predictions = getDb().prepare(`
    SELECT * FROM predictions WHERE event_id = ?
  `).all(eventId);

  const updatePrediction = getDb().prepare(`
    UPDATE predictions SET points_earned = ? WHERE id = ?
  `);

  const updateUserStats = getDb().prepare(`
    UPDATE user_stats SET
      total_points = total_points + ?,
      correct_predictions = correct_predictions + ?,
      perfect_predictions = perfect_predictions + ?
    WHERE user_id = ?
  `);

  predictions.forEach(pred => {
    let points = 0;
    let correctCount = 0;
    let isPerfect = false;

    // Points for correct positions
    if (pred.first_place_id === first?.competitor_id) {
      points += 10;
      correctCount++;
    }
    if (pred.second_place_id === second?.competitor_id) {
      points += 6;
      correctCount++;
    }
    if (pred.third_place_id === third?.competitor_id) {
      points += 4;
      correctCount++;
    }

    // Bonus for perfect prediction
    if (correctCount === 3) {
      points += 5;
      isPerfect = true;
    }

    // Points for world record prediction
    if (pred.world_record_prediction && worldRecordBroken) {
      points += 3;
    }

    // Partial points: correct competitor in wrong position
    const predictedIds = [pred.first_place_id, pred.second_place_id, pred.third_place_id];
    const actualTop3Ids = [first?.competitor_id, second?.competitor_id, third?.competitor_id];

    predictedIds.forEach((predId, idx) => {
      if (predId && actualTop3Ids.includes(predId)) {
        const actualPos = actualTop3Ids.indexOf(predId);
        if (actualPos !== idx) {
          points += 2; // Partial credit for right athlete, wrong position
        }
      }
    });

    updatePrediction.run(points, pred.id);
    updateUserStats.run(points, correctCount > 0 ? 1 : 0, isPerfect ? 1 : 0, pred.user_id);
  });
}

module.exports = router;
