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
  address TEXT,
  role TEXT NOT NULL DEFAULT 'customer'
)`;
db.run(userTableSql, (err) => {
  if (err) console.error('Error creating users table:', err.message);
});

// ตรวจสอบและเพิ่มคอลัมน์ address หากยังไม่มี (migration)
db.all("PRAGMA table_info(users)", (err, columns) => {
  if (!err && columns && !columns.some(col => col.name === 'address')) {
    db.run('ALTER TABLE users ADD COLUMN address TEXT', (err) => {
      if (err) console.error('Error adding address column:', err.message);
      else console.log('Added address column to users table');
    });
  }
});

// สร้างตาราง orders ถ้ายังไม่มี
const orderTableSql = `CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  shipping_name TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
)`;
db.run(orderTableSql, (err) => {
  if (err) console.error('Error creating orders table:', err.message);
});

// สร้างตาราง order_items ถ้ายังไม่มี
const orderItemTableSql = `CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(product_id) REFERENCES products(id)
)`;
db.run(orderItemTableSql, (err) => {
  if (err) console.error('Error creating order_items table:', err.message);
});

// ฟังก์ชันสำหรับระบบสมาชิก
module.exports = {
  db,
  getUserByEmail(email, cb) {
    db.get('SELECT * FROM users WHERE email = ?', [email], cb);
  },
  registerUser(email, password, name, role = 'customer', address = '', cb) {
    db.run('INSERT INTO users (email, password, name, role, address) VALUES (?, ?, ?, ?, ?)', [email, password, name, role, address], function(err) {
      if (err) return cb(err);
      cb(null, { id: this.lastID, email, name, role, address });
    });
  },
  getUserById(id, cb) {
    db.get('SELECT * FROM users WHERE id = ?', [id], cb);
  },
  updateUser(id, name, role, address, cb) {
    db.run('UPDATE users SET name = ?, role = ?, address = ? WHERE id = ?', [name, role, address, id], function(err) {
      if (err) return cb(err);
      cb(null, { id, name, role, address });
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
  },
  // --- ORDER SYSTEM ---
  // เพิ่มคำสั่งซื้อใหม่
  addOrder(userId, shippingName, shippingAddress, items, cb) {
    db.run(
      'INSERT INTO orders (user_id, shipping_name, shipping_address) VALUES (?, ?, ?)',
      [userId, shippingName, shippingAddress],
      function(err) {
        if (err) return cb(err);
        const orderId = this.lastID;
        // เพิ่ม order_items
        const stmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
        for (const item of items) {
          stmt.run(orderId, item.product_id, item.quantity, item.price);
        }
        stmt.finalize((err) => {
          if (err) return cb(err);
          cb(null, { id: orderId });
        });
      }
    );
  },
  // ดูคำสั่งซื้อทั้งหมดของผู้ใช้
  getOrdersByUser(userId, cb) {
    db.all(
      `SELECT o.*, oi.id as item_id, oi.product_id, oi.quantity, oi.price
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC, oi.id ASC`,
      [userId],
      cb
    );
  },
  // สำหรับ admin: ดูคำสั่งซื้อทั้งหมด
  getAllOrders(cb) {
    db.all(
      `SELECT o.*, u.email as user_email, oi.id as item_id, oi.product_id, oi.quantity, oi.price
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       ORDER BY o.created_at DESC, oi.id ASC`,
      [],
      cb
    );
  },
  // อัปเดตสถานะคำสั่งซื้อ
  updateOrderStatus(orderId, status, cb) {
    db.run('UPDATE orders SET status = ? WHERE id = ?', [status, orderId], function(err) {
      if (err) return cb(err);
      cb(null, { id: orderId, status });
    });
  },
}; 