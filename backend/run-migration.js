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
  
  // Get all migration files
  const migrationsDir = path.join(__dirname, 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.js') && file.match(/^\d+/))
    .sort((a, b) => {
      const numA = parseInt(a.match(/^(\d+)/)[0]);
      const numB = parseInt(b.match(/^(\d+)/)[0]);
      return numA - numB;
    });

  let currentIndex = 0;

  const runNextMigration = () => {
    if (currentIndex >= migrationFiles.length) {
      console.log('All migrations completed successfully');
      db.close();
      return;
    }

    const migrationFile = migrationFiles[currentIndex];
    console.log(`Running migration: ${migrationFile}...`);

    try {
      const migration = require(`./migrations/${migrationFile}`);
      
      // Check if migration has an 'up' function
      if (typeof migration.up === 'function') {
        migration.up(db, (err) => {
          if (err) {
            console.error(`Migration ${migrationFile} failed:`, err);
            db.close();
            process.exit(1);
          } else {
            console.log(`Migration ${migrationFile} completed successfully`);
            currentIndex++;
            runNextMigration();
          }
        });
      } else {
        // For backward compatibility with older migrations
        migration(db, (err) => {
          if (err) {
            console.error(`Migration ${migrationFile} failed:`, err);
            db.close();
            process.exit(1);
          } else {
            console.log(`Migration ${migrationFile} completed successfully`);
            currentIndex++;
            runNextMigration();
          }
        });
      }
    } catch (err) {
      console.error(`Error running migration ${migrationFile}:`, err);
      db.close();
      process.exit(1);
    }
  };

  console.log('Starting migrations...');
  runNextMigration();
});
