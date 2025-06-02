module.exports = {
  up: function(db, callback) {
    // Check if categories table already exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'", [], (err, row) => {
      if (err) {
        console.error('Error checking if categories table exists:', err);
        return callback(err);
      }

      if (row) {
        console.log('Categories table already exists');
        return callback();
      }

      // Create the categories table
      console.log('Creating categories table...');
      db.run(`
        CREATE TABLE categories (
          categoryId INTEGER PRIMARY KEY AUTOINCREMENT,
          categoryName TEXT NOT NULL,
          categoryNote TEXT,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `, function(err) {
        if (err) {
          console.error('Error creating categories table:', err.message);
          return callback(err);
        }
        
        console.log('Successfully created categories table');
        
        // Add a trigger to update the updatedAt timestamp on row update
        db.run(`
          CREATE TRIGGER IF NOT EXISTS update_categories_timestamp
          AFTER UPDATE ON categories
          FOR EACH ROW
          BEGIN
            UPDATE categories SET updatedAt = CURRENT_TIMESTAMP WHERE categoryId = OLD.categoryId;
          END;
        `, function(err) {
          if (err) {
            console.error('Error creating update trigger for categories:', err.message);
            return callback(err);
          }
          console.log('Added update trigger for categories table');
          callback();
        });
      });
    });
  }
};
