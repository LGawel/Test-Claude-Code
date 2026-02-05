const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for post image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'posts');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'post-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for memes
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

// Get posts for a pool (prikbord)
router.get('/pool/:poolId', authenticateToken, (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    // Check if user is member
    const isMember = getDb().prepare('SELECT * FROM pool_members WHERE pool_id = ? AND user_id = ?')
      .get(req.params.poolId, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this pool' });
    }

    const posts = getDb().prepare(`
      SELECT pp.*, u.nickname, u.profile_image,
             (SELECT COUNT(*) FROM post_comments WHERE post_id = pp.id) as comment_count
      FROM pool_posts pp
      JOIN users u ON pp.user_id = u.id
      WHERE pp.pool_id = ?
      ORDER BY pp.created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.params.poolId, parseInt(limit), parseInt(offset));

    const totalPosts = getDb().prepare(
      'SELECT COUNT(*) as count FROM pool_posts WHERE pool_id = ?'
    ).get(req.params.poolId).count;

    res.json({
      posts,
      total: totalPosts,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to get posts' });
  }
});

// Create new post
router.post('/pool/:poolId', authenticateToken, upload.single('image'), (req, res) => {
  try {
    const { content } = req.body;
    const poolId = req.params.poolId;

    // Check if user is member
    const isMember = getDb().prepare('SELECT * FROM pool_members WHERE pool_id = ? AND user_id = ?')
      .get(poolId, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this pool' });
    }

    if (!content && !req.file) {
      return res.status(400).json({ error: 'Post must have content or an image' });
    }

    const imageUrl = req.file ? `/uploads/posts/${req.file.filename}` : null;

    const result = getDb().prepare(`
      INSERT INTO pool_posts (pool_id, user_id, content, image_url)
      VALUES (?, ?, ?, ?)
    `).run(poolId, req.user.id, content || null, imageUrl);

    const newPost = getDb().prepare(`
      SELECT pp.*, u.nickname, u.profile_image
      FROM pool_posts pp
      JOIN users u ON pp.user_id = u.id
      WHERE pp.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Post created',
      post: newPost
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Delete post
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const post = getDb().prepare('SELECT * FROM pool_posts WHERE id = ?').get(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if user is the author or pool creator
    const pool = getDb().prepare('SELECT created_by FROM pools WHERE id = ?').get(post.pool_id);
    if (post.user_id !== req.user.id && pool.created_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    // Delete image if exists
    if (post.image_url) {
      const imagePath = path.join(__dirname, '..', post.image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    getDb().prepare('DELETE FROM pool_posts WHERE id = ?').run(req.params.id);

    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Get comments for a post
router.get('/:postId/comments', authenticateToken, (req, res) => {
  try {
    const post = getDb().prepare('SELECT pool_id FROM pool_posts WHERE id = ?').get(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if user is member
    const isMember = getDb().prepare('SELECT * FROM pool_members WHERE pool_id = ? AND user_id = ?')
      .get(post.pool_id, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this pool' });
    }

    const comments = getDb().prepare(`
      SELECT pc.*, u.nickname, u.profile_image
      FROM post_comments pc
      JOIN users u ON pc.user_id = u.id
      WHERE pc.post_id = ?
      ORDER BY pc.created_at ASC
    `).all(req.params.postId);

    res.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

// Add comment to post
router.post('/:postId/comments', authenticateToken, (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const post = getDb().prepare('SELECT pool_id FROM pool_posts WHERE id = ?').get(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if user is member
    const isMember = getDb().prepare('SELECT * FROM pool_members WHERE pool_id = ? AND user_id = ?')
      .get(post.pool_id, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this pool' });
    }

    const result = getDb().prepare(`
      INSERT INTO post_comments (post_id, user_id, content)
      VALUES (?, ?, ?)
    `).run(req.params.postId, req.user.id, content.trim());

    const newComment = getDb().prepare(`
      SELECT pc.*, u.nickname, u.profile_image
      FROM post_comments pc
      JOIN users u ON pc.user_id = u.id
      WHERE pc.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Comment added',
      comment: newComment
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Delete comment
router.delete('/comments/:id', authenticateToken, (req, res) => {
  try {
    const comment = getDb().prepare(`
      SELECT pc.*, pp.pool_id
      FROM post_comments pc
      JOIN pool_posts pp ON pc.post_id = pp.id
      WHERE pc.id = ?
    `).get(req.params.id);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user is the author or pool creator
    const pool = getDb().prepare('SELECT created_by FROM pools WHERE id = ?').get(comment.pool_id);
    if (comment.user_id !== req.user.id && pool.created_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    getDb().prepare('DELETE FROM post_comments WHERE id = ?').run(req.params.id);

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

module.exports = router;
