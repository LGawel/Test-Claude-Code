const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'wintergames.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
const createTables = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  nickname TEXT NOT NULL,
  profile_image TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sports table
CREATE TABLE IF NOT EXISTS sports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT,
  description TEXT
);

-- Tournaments table (e.g., Winter Olympics 2026)
CREATE TABLE IF NOT EXISTS tournaments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  location TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Events table (specific competitions within a tournament)
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  sport_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  event_date DATETIME NOT NULL,
  deadline DATETIME NOT NULL,
  status TEXT DEFAULT 'upcoming',
  world_record_time TEXT,
  world_record_holder TEXT,
  is_world_record_broken INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
  FOREIGN KEY (sport_id) REFERENCES sports(id)
);

-- Competitors table (athletes)
CREATE TABLE IF NOT EXISTS competitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  country_code TEXT,
  image TEXT,
  sport_id INTEGER,
  FOREIGN KEY (sport_id) REFERENCES sports(id)
);

-- Event results table
CREATE TABLE IF NOT EXISTS event_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  competitor_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  time TEXT,
  is_world_record INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (competitor_id) REFERENCES competitors(id)
);

-- Pools (Poules) table
CREATE TABLE IF NOT EXISTS pools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  tournament_id INTEGER NOT NULL,
  created_by INTEGER NOT NULL,
  max_members INTEGER DEFAULT 20,
  entry_fee DECIMAL(10,2) DEFAULT 0,
  prize_pool DECIMAL(10,2) DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Pool sports (which sports are included in a pool)
CREATE TABLE IF NOT EXISTS pool_sports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pool_id INTEGER NOT NULL,
  sport_id INTEGER NOT NULL,
  FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE,
  FOREIGN KEY (sport_id) REFERENCES sports(id),
  UNIQUE(pool_id, sport_id)
);

-- Pool members table
CREATE TABLE IF NOT EXISTS pool_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pool_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  has_paid INTEGER DEFAULT 0,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(pool_id, user_id)
);

-- Predictions table
CREATE TABLE IF NOT EXISTS predictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  pool_id INTEGER NOT NULL,
  event_id INTEGER NOT NULL,
  first_place_id INTEGER,
  second_place_id INTEGER,
  third_place_id INTEGER,
  predicted_time TEXT,
  world_record_prediction INTEGER DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (first_place_id) REFERENCES competitors(id),
  FOREIGN KEY (second_place_id) REFERENCES competitors(id),
  FOREIGN KEY (third_place_id) REFERENCES competitors(id),
  UNIQUE(user_id, pool_id, event_id)
);

-- Trophies table
CREATE TABLE IF NOT EXISTS trophies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  type TEXT NOT NULL
);

-- User trophies table
CREATE TABLE IF NOT EXISTS user_trophies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  trophy_id INTEGER NOT NULL,
  pool_id INTEGER,
  tournament_id INTEGER,
  earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (trophy_id) REFERENCES trophies(id),
  FOREIGN KEY (pool_id) REFERENCES pools(id),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
);

-- User statistics table
CREATE TABLE IF NOT EXISTS user_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  pools_won INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  perfect_predictions INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Pool bulletin board (prikbord)
CREATE TABLE IF NOT EXISTS pool_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pool_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT,
  image_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Post reactions/comments
CREATE TABLE IF NOT EXISTS post_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES pool_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  is_read INTEGER DEFAULT 0,
  related_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`;

// Execute table creation
db.exec(createTables);

// Insert default sports
const insertSports = db.prepare(`
  INSERT OR IGNORE INTO sports (id, name, icon, description) VALUES (?, ?, ?, ?)
`);

const sports = [
  [1, 'Schaatsen', '⛸️', 'Langebaanschaatsen op verschillende afstanden'],
  [2, 'Bobsleeën', '🛷', 'Bobslee races op de ijsbaan'],
  [3, 'Snowboarden', '🏂', 'Snowboard evenementen zoals halfpipe, slopestyle en boardercross']
];

sports.forEach(sport => insertSports.run(...sport));

// Insert default trophies
const insertTrophies = db.prepare(`
  INSERT OR IGNORE INTO trophies (id, name, description, icon, type) VALUES (?, ?, ?, ?, ?)
`);

const trophies = [
  [1, 'Poule Kampioen', 'Winnaar van een poule', '🏆', 'pool_winner'],
  [2, 'Perfecte Voorspelling', 'Volledige top 3 correct voorspeld', '🎯', 'perfect_prediction'],
  [3, 'Wereldrecord Voorspeller', 'Correct voorspeld dat er een wereldrecord zou worden verbroken', '🌍', 'world_record'],
  [4, 'Op Dreef', '5 correcte voorspellingen op rij', '🔥', 'streak_5'],
  [5, 'Onstopbaar', '10 correcte voorspellingen op rij', '⚡', 'streak_10'],
  [6, 'Schaats Expert', '10 correcte schaatsvoorspellingen', '⛸️', 'sport_expert_skating'],
  [7, 'Bobslee Meester', '10 correcte bobsleevoorspellingen', '🛷', 'sport_expert_bobsled'],
  [8, 'Snowboard Pro', '10 correcte snowboardvoorspellingen', '🏂', 'sport_expert_snowboard'],
  [9, 'Eerste Bloed', 'Eerste voorspelling gemaakt', '🩸', 'first_prediction'],
  [10, 'Veteraan', 'Deelgenomen aan 10 poules', '🎖️', 'veteran']
];

trophies.forEach(trophy => insertTrophies.run(...trophy));

// Insert sample tournament (Winter Olympics 2026)
const insertTournament = db.prepare(`
  INSERT OR IGNORE INTO tournaments (id, name, start_date, end_date, location, is_active)
  VALUES (?, ?, ?, ?, ?, ?)
`);

insertTournament.run(1, 'Olympische Winterspelen 2026', '2026-02-06', '2026-02-22', 'Milano-Cortina, Italië', 1);

// Insert sample competitors
const insertCompetitor = db.prepare(`
  INSERT OR IGNORE INTO competitors (id, name, country, country_code, sport_id)
  VALUES (?, ?, ?, ?, ?)
`);

const competitors = [
  // Schaatsers
  [1, 'Jutta Leerdam', 'Nederland', 'NL', 1],
  [2, 'Kjeld Nuis', 'Nederland', 'NL', 1],
  [3, 'Thomas Krol', 'Nederland', 'NL', 1],
  [4, 'Patrick Roest', 'Nederland', 'NL', 1],
  [5, 'Nils van der Poel', 'Zweden', 'SE', 1],
  [6, 'Gao Tingyu', 'China', 'CN', 1],
  [7, 'Miho Takagi', 'Japan', 'JP', 1],
  [8, 'Brittany Bowe', 'Verenigde Staten', 'US', 1],
  // Bobsleeërs
  [9, 'Francesco Friedrich', 'Duitsland', 'DE', 2],
  [10, 'Johannes Lochner', 'Duitsland', 'DE', 2],
  [11, 'Kaillie Humphries', 'Verenigde Staten', 'US', 2],
  [12, 'Laura Nolte', 'Duitsland', 'DE', 2],
  // Snowboarders
  [13, 'Shaun White', 'Verenigde Staten', 'US', 3],
  [14, 'Chloe Kim', 'Verenigde Staten', 'US', 3],
  [15, 'Ayumu Hirano', 'Japan', 'JP', 3],
  [16, 'Lindsey Jacobellis', 'Verenigde Staten', 'US', 3],
  [17, 'Scotty James', 'Australië', 'AU', 3],
  [18, 'Anna Gasser', 'Oostenrijk', 'AT', 3]
];

competitors.forEach(comp => insertCompetitor.run(...comp));

// Insert sample events
const insertEvent = db.prepare(`
  INSERT OR IGNORE INTO events (id, tournament_id, sport_id, name, event_date, deadline, world_record_time, world_record_holder)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const events = [
  // Schaatsen
  [1, 1, 1, 'Schaatsen - 500m Mannen', '2026-02-08 14:00:00', '2026-02-08 13:00:00', '33.98', 'Gao Tingyu'],
  [2, 1, 1, 'Schaatsen - 500m Vrouwen', '2026-02-08 16:00:00', '2026-02-08 15:00:00', '36.36', 'Nao Kodaira'],
  [3, 1, 1, 'Schaatsen - 1000m Mannen', '2026-02-10 14:00:00', '2026-02-10 13:00:00', '1:06.18', 'Pavel Kulizhnikov'],
  [4, 1, 1, 'Schaatsen - 1000m Vrouwen', '2026-02-10 16:00:00', '2026-02-10 15:00:00', '1:11.61', 'Brittany Bowe'],
  [5, 1, 1, 'Schaatsen - 1500m Mannen', '2026-02-12 14:00:00', '2026-02-12 13:00:00', '1:40.17', 'Kjeld Nuis'],
  [6, 1, 1, 'Schaatsen - 5000m Mannen', '2026-02-14 14:00:00', '2026-02-14 13:00:00', '6:01.56', 'Nils van der Poel'],
  // Bobsleeën
  [7, 1, 2, 'Bobslee - Tweemans Mannen', '2026-02-15 14:00:00', '2026-02-15 13:00:00', null, null],
  [8, 1, 2, 'Bobslee - Tweemans Vrouwen', '2026-02-16 14:00:00', '2026-02-16 13:00:00', null, null],
  [9, 1, 2, 'Bobslee - Viermans', '2026-02-18 14:00:00', '2026-02-18 13:00:00', null, null],
  // Snowboarden
  [10, 1, 3, 'Snowboard - Halfpipe Mannen', '2026-02-11 10:00:00', '2026-02-11 09:00:00', null, null],
  [11, 1, 3, 'Snowboard - Halfpipe Vrouwen', '2026-02-11 14:00:00', '2026-02-11 13:00:00', null, null],
  [12, 1, 3, 'Snowboard - Slopestyle Mannen', '2026-02-13 10:00:00', '2026-02-13 09:00:00', null, null],
  [13, 1, 3, 'Snowboard - Slopestyle Vrouwen', '2026-02-13 14:00:00', '2026-02-13 13:00:00', null, null],
  [14, 1, 3, 'Snowboard - Boardercross Mannen', '2026-02-17 10:00:00', '2026-02-17 09:00:00', null, null],
  [15, 1, 3, 'Snowboard - Boardercross Vrouwen', '2026-02-17 14:00:00', '2026-02-17 13:00:00', null, null]
];

events.forEach(event => insertEvent.run(...event));

console.log('✅ Database initialized successfully!');
console.log('📍 Database location:', dbPath);
console.log('🏅 Created tables: users, sports, tournaments, events, competitors, pools, predictions, trophies, etc.');
console.log('🎿 Added 3 winter sports: Schaatsen, Bobsleeën, Snowboarden');
console.log('🏆 Added 10 trophies');
console.log('👥 Added 18 sample competitors');
console.log('📅 Added 15 sample events for Winter Olympics 2026');

db.close();
