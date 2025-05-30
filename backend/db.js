const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
console.log('DB path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// สร้างตาราง users ถ้ายังไม่มี
const userTableSql = `CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer'
)`;
db.run(userTableSql, (err) => {
  if (err) console.error('Error creating users table:', err.message);
});

// ฟังก์ชันสำหรับระบบสมาชิก
module.exports = {
  db,
  getUserByEmail(email, cb) {
    db.get('SELECT * FROM users WHERE email = ?', [email], cb);
  },
  registerUser(email, password, name, role = 'customer', cb) {
    db.run('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)', [email, password, name, role], function(err) {
      if (err) return cb(err);
      cb(null, { id: this.lastID, email, name, role });
    });
  },
  getUserById(id, cb) {
    db.get('SELECT id, email, name, role FROM users WHERE id = ?', [id], cb);
  },
  updateUser(id, name, role, cb) {
    db.run('UPDATE users SET name = ?, role = ? WHERE id = ?', [name, role, id], function(err) {
      if (err) return cb(err);
      cb(null, { id, name, role });
    });
  },
  getAllProducts(cb) {
    db.all('SELECT * FROM products', cb);
  },
  addProduct(product, cb) {
    db.run(
      'INSERT INTO products (title, price, description, category, image, rating_rate, rating_count) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [product.title, product.price, product.description, product.category, product.image, product.rating_rate, product.rating_count],
      function(err) {
        if (err) return cb(err);
        cb(null, { id: this.lastID, ...product });
      }
    );
  },
  updateProduct(id, product, cb) {
    db.run(
      'UPDATE products SET title = ?, price = ?, description = ?, category = ?, image = ?, rating_rate = ?, rating_count = ? WHERE id = ?',
      [product.title, product.price, product.description, product.category, product.image, product.rating_rate, product.rating_count, id],
      function(err) {
        if (err) return cb(err);
        cb(null, { id, ...product });
      }
    );
  },
  deleteProduct(id, cb) {
    db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
      if (err) return cb(err);
      cb(null, { id });
    });
  }
}; 