const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
console.log('DB path:', dbPath);

// Create a simple database connection
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
  
  // Enable foreign key constraints
  db.run("PRAGMA foreign_keys = ON", (err) => {
    if (err) {
      console.error('Error enabling foreign keys:', err.message);
    } else {
      console.log('Foreign key constraints enabled');
    }
  });
});

// Add error handler
db.on('error', (err) => {
  console.error('Database error:', err);
});

// Promisify common methods using util
const util = require('util');
const dbMethods = {
  run: function(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  
  get: function(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  },
  
  all: function(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }
};

// Create a new object with all the database methods
const dbExports = {};

// Add all methods from dbMethods
dbExports.run = dbMethods.run;
dbExports.get = dbMethods.get;
dbExports.all = dbMethods.all;

// Add all other methods from the original db object
Object.getOwnPropertyNames(db)
  .filter(key => typeof db[key] === 'function' && !['run', 'get', 'all'].includes(key))
  .forEach(key => {
    dbExports[key] = db[key];
  });

// Add the database instance as a property
dbExports.db = db;

module.exports = dbExports;
