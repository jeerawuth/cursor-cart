const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Create a new database connection
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  
  console.log('Connected to database');
  
  // Run the migration
  const migration = require('./migrations/002_add_stock_movements');
  console.log('Running migration...');
  
  // Pass the db instance to the migration
  migration.up(db, (err) => {
    if (err) {
      console.error('Migration failed:', err);
    } else {
      console.log('Migration completed successfully');
    }
    db.close();
  });
});
