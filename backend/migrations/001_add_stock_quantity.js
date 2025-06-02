const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

// Check if stock_quantity column exists
console.log('Checking if stock_quantity column exists in products table...');
db.all("PRAGMA table_info(products)", [], (err, columns) => {
  if (err) {
    console.error('Error getting table info:', err);
    process.exit(1);
  }

  const hasStockQuantity = columns.some(col => col.name === 'stock_quantity');
  
  if (hasStockQuantity) {
    console.log('stock_quantity column already exists in products table');
    db.close();
    return;
  }

  // Add the stock_quantity column with a default value of 0
  console.log('Adding stock_quantity column to products table...');
  db.run('ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT 0', (err) => {
    if (err) {
      console.error('Error adding stock_quantity column:', err.message);
      db.close();
      process.exit(1);
    }
    
    console.log('Successfully added stock_quantity column to products table');
    
    // Update existing products with a default stock quantity if needed
    db.run('UPDATE products SET stock_quantity = 10 WHERE stock_quantity IS NULL', (err) => {
      if (err) {
        console.error('Error setting default stock quantity:', err.message);
      } else {
        console.log('Set default stock quantity for existing products');
      }
      db.close();
    });
  });
});
