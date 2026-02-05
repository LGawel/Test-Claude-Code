const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'wintergames.db');

let db = null;
let SQL = null;

// Wrapper class to provide better-sqlite3 compatible API
class StatementWrapper {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
  }

  run(...params) {
    this.db.run(this.sql, params);
    return {
      lastInsertRowid: this.db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] || 0,
      changes: this.db.getRowsModified()
    };
  }

  get(...params) {
    const stmt = this.db.prepare(this.sql);
    stmt.bind(params);
    if (stmt.step()) {
      const columns = stmt.getColumnNames();
      const values = stmt.get();
      const result = {};
      columns.forEach((col, i) => {
        result[col] = values[i];
      });
      stmt.free();
      return result;
    }
    stmt.free();
    return undefined;
  }

  all(...params) {
    const results = [];
    const stmt = this.db.prepare(this.sql);
    stmt.bind(params);
    while (stmt.step()) {
      const columns = stmt.getColumnNames();
      const values = stmt.get();
      const row = {};
      columns.forEach((col, i) => {
        row[col] = values[i];
      });
      results.push(row);
    }
    stmt.free();
    return results;
  }
}

// Database wrapper with better-sqlite3 compatible API
class DatabaseWrapper {
  constructor(sqlDb) {
    this.db = sqlDb;
  }

  prepare(sql) {
    return new StatementWrapper(this.db, sql);
  }

  exec(sql) {
    this.db.exec(sql);
  }

  pragma(pragmaStr) {
    this.db.exec(`PRAGMA ${pragmaStr}`);
  }

  close() {
    this.db.close();
  }

  // Save database to file
  save() {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// Initialize database
async function initDatabase() {
  if (db) return db;

  SQL = await initSqlJs();

  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new DatabaseWrapper(new SQL.Database(fileBuffer));
  } else {
    db = new DatabaseWrapper(new SQL.Database());
  }

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Auto-save on process exit
  process.on('exit', () => {
    if (db) {
      db.save();
    }
  });

  // Save periodically (every 30 seconds)
  setInterval(() => {
    if (db) {
      db.save();
    }
  }, 30000);

  return db;
}

// Get database instance (sync after init)
function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Export for compatibility - creates a proxy that waits for init
const dbProxy = new Proxy({}, {
  get(target, prop) {
    if (!db) {
      throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db[prop].bind(db);
  }
});

module.exports = {
  initDatabase,
  getDb,
  dbProxy,
  get db() { return db; }
};
