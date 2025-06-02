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
  registerUser(email, password, name, role = 'customer', address, cb) {
    // If the last parameter is not a function, it means the callback was passed as the 5th parameter
    if (typeof address === 'function') {
      cb = address;
      address = '';
    }
    
    db.run('INSERT INTO users (email, password, name, role, address) VALUES (?, ?, ?, ?, ?)', 
      [email, password, name, role, address || ''], 
      function(err) {
        if (err) return cb(err);
        cb(null, { 
          id: this.lastID, 
          email, 
          name, 
          role, 
          address: address || '' 
        });
      }
    );
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
  
  getProductsByCategory(category, cb) {
    if (!category) return this.getAllProducts(cb);
    
    // First, get the category name from the categories table
    db.get('SELECT categoryName FROM categories WHERE categoryId = ?', [category], (err, catRow) => {
      if (err) return cb(err);
      if (!catRow) return cb({ status: 404, message: 'ไม่พบหมวดหมู่นี้' });
      
      const categoryName = catRow.categoryName;
      
      // Then get products with matching category name
      db.all(
        'SELECT * FROM products WHERE category = ?', 
        [categoryName], 
        (err, products) => {
          if (err) {
            console.error('Error fetching products by category:', err);
            return cb(err);
          }
          cb(null, products || []);
        }
      );
    });
  },
  
  // Get single product by ID
  getProductById(id, cb) {
    db.get('SELECT * FROM products WHERE id = ?', [id], (err, product) => {
      if (err) return cb(err);
      if (!product) return cb(new Error('Product not found'));
      cb(null, product);
    });
  },
  addProduct(product, cb) {
    db.run(
      'INSERT INTO products (title, price, description, category, image, rating_rate, rating_count, stock_quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        product.title, 
        product.price, 
        product.description, 
        product.category, 
        product.image, 
        product.rating_rate, 
        product.rating_count,
        product.stock_quantity !== undefined ? product.stock_quantity : 0
      ],
      function(err) {
        if (err) return cb(err);
        cb(null, { id: this.lastID, ...product });
      }
    );
  },
  updateProduct(id, product, cb) {
    db.run(
      'UPDATE products SET title = ?, price = ?, description = ?, category = ?, image = ?, rating_rate = ?, rating_count = ?, stock_quantity = ? WHERE id = ?',
      [
        product.title, 
        product.price, 
        product.description, 
        product.category, 
        product.image, 
        product.rating_rate, 
        product.rating_count, 
        product.stock_quantity !== undefined ? product.stock_quantity : 0,
        id
      ],
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
  // อัปเดตสถานะคำสั่งซื้อ และจัดการสต็อก
  updateOrderStatus(orderId, status, cb) {
    // เริ่ม transaction
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // 1. ดึงข้อมูลคำสั่งซื้อเดิม
      db.get('SELECT status FROM orders WHERE id = ?', [orderId], (err, order) => {
        if (err) {
          db.run('ROLLBACK');
          return cb(err);
        }
        
        const oldStatus = order.status;
        
        // 2. อัปเดตสถานะใหม่
        db.run('UPDATE orders SET status = ? WHERE id = ?', [status, orderId], (err) => {
          if (err) {
            db.run('ROLLBACK');
            return cb(err);
          }
          
          // 3. ตรวจสอบการเปลี่ยนแปลงสถานะที่ต้องจัดการสต็อก
          if ((oldStatus !== 'paid' && status === 'paid') || 
              (oldStatus === 'paid' && status === 'cancelled')) {
            
            // ดึงรายการสินค้าในคำสั่งซื้อ
            db.all(
              'SELECT product_id, quantity FROM order_items WHERE order_id = ?', 
              [orderId], 
              (err, items) => {
                if (err) {
                  db.run('ROLLBACK');
                  return cb(err);
                }
                
                // วนลูปปรับปรุงสต็อกสินค้า
                let completed = 0;
                if (items.length === 0) return db.run('COMMIT', cb);
                
                items.forEach((item) => {
                  // คำนวณจำนวนที่ต้องปรับ (บวกเมื่อยกเลิก, ลบเมื่อชำระเงิน)
                  const quantityChange = status === 'paid' ? -item.quantity : item.quantity;
                  
                  // อัปเดตสต็อกสินค้า
                  db.run(
                    'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
                    [quantityChange, item.product_id],
                    (err) => {
                      if (err) {
                        db.run('ROLLBACK');
                        return cb(err);
                      }
                      
                      // บันทึกประวัติการปรับปรุงสต็อก
                      db.run(
                        'INSERT INTO stock_movements (product_id, order_id, quantity, movement_type, created_at) VALUES (?, ?, ?, ?, ?)',
                        [
                          item.product_id,
                          orderId,
                          Math.abs(quantityChange),
                          status === 'paid' ? 'out' : 'in',
                          new Date().toISOString()
                        ],
                        (err) => {
                          if (err) {
                            console.error('Error logging stock movement:', err);
                            // ไม่ต้องหยุดการทำงานถ้าไม่สามารถบันทึกประวัติได้
                          }
                          
                          completed++;
                          if (completed === items.length) {
                            db.run('COMMIT', (err) => {
                              if (err) return cb(err);
                              cb(null, { message: 'อัปเดตสถานะและปรับปรุงสต็อกเรียบร้อย' });
                            });
                          }
                        }
                      );
                    }
                  );
                });
              }
            );
          } else {
            // ไม่มีการปรับปรุงสต็อก ทำการ commit transaction
            db.run('COMMIT', (err) => {
              if (err) return cb(err);
              cb(null, { message: 'อัปเดตสถานะเรียบร้อย' });
            });
          }
        });
      });
    });
  },
  // --- USER MANAGEMENT ---
  // Get all users (admin only)
  getAllUsers(cb) {
    db.all('SELECT id, email, name, role, address, created_at as createdAt FROM users', (err, rows) => {
      if (err) {
        console.error('Error getting users:', err);
        return cb(err);
      }
      cb(null, rows);
    });
  },
  // Delete a user by ID
  deleteUser(userId, cb) {
    const requestId = Math.random().toString(36).substr(2, 9);
    const log = (message, data = '') => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [DB:${requestId}] ${message}`, data);
    };
    
    log('Starting user deletion process', { userId });
    
    // First, check if the user exists
    db.get('SELECT id, email, role FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) {
        log('Error checking if user exists:', err);
        return cb(err);
      }
      
      if (!user) {
        log('User not found', { userId });
        return cb(new Error('User not found'));
      }
      
      log('Starting database transaction');
      db.run('BEGIN TRANSACTION', (beginErr) => {
        if (beginErr) {
          log('Error starting transaction:', beginErr);
          return cb(beginErr);
        }
        
        // Function to handle the rest of the deletion process
        const continueDeletion = () => {
          // 1. Delete user's cart (if exists)
          log('Deleting user cart');
          db.run('DELETE FROM carts WHERE user_id = ?', [userId], (cartErr) => {
            if (cartErr) {
              log('Error deleting cart (will continue):', cartErr.message);
              // Continue even if cart deletion fails
            }
            
            // 2. Delete user's orders (order_items will be deleted by CASCADE)
            log('Deleting user orders');
            db.run('DELETE FROM orders WHERE user_id = ?', [userId], (orderErr) => {
              if (orderErr) {
                log('Error deleting orders (will continue):', orderErr.message);
                // Continue even if orders deletion fails
              }
              
              // 3. Finally, delete the user
              log('Deleting user record');
              db.run('DELETE FROM users WHERE id = ?', [userId], function(userErr) {
                if (userErr) {
                  log('Error deleting user:', userErr);
                  return db.run('ROLLBACK', () => cb(userErr));
                }
                
                // If we got here, everything was successful
                log('User deletion successful, committing transaction');
                db.run('COMMIT', (commitErr) => {
                  if (commitErr) {
                    log('Error committing transaction:', commitErr.message);
                    return db.run('ROLLBACK', () => {
                      log('Transaction rolled back due to commit error');
                      cb(commitErr);
                    });
                  }
                  log('Transaction committed successfully');
                  cb(null, { success: true, userId, requestId });
                });
              });
            });
          });
        };
        
        // Start the deletion process
        continueDeletion();
      });
    });
  },
  // Update user role
  updateUserRole(userId, role, cb) {
    db.run('UPDATE users SET role = ? WHERE id = ?', [role, userId], function(err) {
      if (err) return cb(err);
      db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) return cb(err);
        cb(null, user);
      });
    });
  },
  // --- CART SYSTEM ---
  // ดึง cart ของ user
  getCartByUserId(userId, cb) {
    db.get('SELECT items FROM carts WHERE user_id = ?', [userId], (err, row) => {
      if (err) return cb(err);
      if (!row) return cb(null, []);
      try {
        const items = JSON.parse(row.items);
        cb(null, items);
      } catch (e) {
        cb(null, []);
      }
    });
  },
  // บันทึก (insert หรือ update) cart ของ user
  upsertCart(userId, items, cb) {
    const itemsStr = JSON.stringify(items);
    db.run(
      'INSERT INTO carts (user_id, items, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET items = excluded.items, updated_at = CURRENT_TIMESTAMP',
      [userId, itemsStr],
      function (err) {
        cb(err);
      }
    );
  },
  // Clear cart
  clearCart: function(userId, cb) {
    db.run('DELETE FROM carts WHERE user_id = ?', [userId], function(err) {
      if (err) {
        console.error('Error clearing cart:', err);
        return cb(err);
      }
      cb(null, { success: true });
    });
  },
  
  // --- CATEGORIES ---
  // Get all categories
  getAllCategories: function(cb) {
    db.all('SELECT * FROM categories ORDER BY categoryName', [], (err, rows) => {
      if (err) {
        console.error('Error getting categories:', err);
        return cb(err);
      }
      cb(null, rows);
    });
  },

  // Get single category by ID
  getCategoryById: function(categoryId, cb) {
    db.get('SELECT * FROM categories WHERE categoryId = ?', [categoryId], (err, row) => {
      if (err) {
        console.error('Error getting category:', err);
        return cb(err);
      }
      if (!row) return cb({ status: 404, message: 'Category not found' });
      cb(null, row);
    });
  },

  // Create new category
  createCategory: function(category, cb) {
    const { categoryName, categoryNote } = category;
    if (!categoryName) return cb({ status: 400, message: 'Category name is required' });
    
    db.run(
      'INSERT INTO categories (categoryName, categoryNote) VALUES (?, ?)',
      [categoryName, categoryNote || null],
      function(err) {
        if (err) {
          console.error('Error creating category:', err);
          if (err.code === 'SQLITE_CONSTRAINT') {
            return cb({ status: 400, message: 'มีชื่อหมวดหมู่นี้อยู่แล้ว' });
          }
          return cb(err);
        }
        
        // Get the newly created category
        db.get('SELECT * FROM categories WHERE categoryId = ?', [this.lastID], (err, row) => {
          if (err) {
            console.error('Error fetching created category:', err);
            return cb(err);
          }
          if (!row) {
            console.error('Created category not found');
            return cb(new Error('ไม่สามารถสร้างหมวดหมู่ได้'));
          }
          cb(null, row);
        });
      }
    );
  },

  // Update category
  updateCategory: function(categoryId, category, cb) {
    const { categoryName, categoryNote } = category;
    if (!categoryName) return cb({ status: 400, message: 'Category name is required' });
    
    db.run(
      'UPDATE categories SET categoryName = ?, categoryNote = ?, updatedAt = CURRENT_TIMESTAMP WHERE categoryId = ?',
      [categoryName, categoryNote || null, categoryId],
      function(err) {
        if (err) {
          console.error('Error updating category:', err);
          if (err.code === 'SQLITE_CONSTRAINT') {
            return cb({ status: 400, message: 'Category name already exists' });
          }
          return cb(err);
        }
        if (this.changes === 0) {
          return cb({ status: 404, message: 'Category not found' });
        }
        db.get('SELECT * FROM categories WHERE categoryId = ?', [categoryId], cb);
      }
    );
  },

  // Delete category
  deleteCategory: function(categoryId, cb) {
    // First get the category name
    db.get('SELECT categoryName FROM categories WHERE categoryId = ?', [categoryId], (err, category) => {
      if (err) return cb(err);
      if (!category) {
        return cb({ status: 404, message: 'Category not found' });
      }
      
      // Check if there are any products using this category name
      db.get('SELECT COUNT(*) as count FROM products WHERE category = ?', [category.categoryName], (err, row) => {
        if (err) return cb(err);
        if (row.count > 0) {
          return cb({ status: 400, message: 'ไม่สามารถลบหมวดหมู่ที่มีสินค้าอยู่ได้' });
        }
        
        // If no products are using this category, delete it
        db.run('DELETE FROM categories WHERE categoryId = ?', [categoryId], function(err) {
          if (err) {
            console.error('Error deleting category:', err);
            return cb(err);
          }
          if (this.changes === 0) {
            return cb({ status: 404, message: 'ไม่พบหมวดหมู่' });
          }
          cb(null, { success: true });
        });
      });
    });
  }
};