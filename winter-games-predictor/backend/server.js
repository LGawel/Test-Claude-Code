const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const poolRoutes = require('./routes/pools');
const eventRoutes = require('./routes/events');
const predictionRoutes = require('./routes/predictions');
const leaderboardRoutes = require('./routes/leaderboards');
const postRoutes = require('./routes/posts');
const trophyRoutes = require('./routes/trophies');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pools', poolRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/leaderboards', leaderboardRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/trophies', trophyRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Winter Games Predictor API is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🏔️  Winter Games Predictor API running on port ${PORT}`);
  console.log(`❄️  http://localhost:${PORT}`);
});
