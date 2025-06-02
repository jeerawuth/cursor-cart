module.exports = {
  up: function(db, callback) {
    // Create stock_movements table
    db.run(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        order_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        movement_type TEXT NOT NULL, -- 'in' or 'out'
        created_at TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products (id),
        FOREIGN KEY (order_id) REFERENCES orders (id)
      )
    `, function(err) {
      if (err) return callback(err);
      console.log('Created stock_movements table');
      callback();
    });
  },
  
  down: function(db, callback) {
    db.run('DROP TABLE IF EXISTS stock_movements', function(err) {
      if (err) return callback(err);
      console.log('Dropped stock_movements table');
      callback();
    });
  }
};
