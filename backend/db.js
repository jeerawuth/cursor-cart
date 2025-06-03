const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const util = require('util');

const dbPath = path.resolve(__dirname, 'database.sqlite');
console.log('DB path:', dbPath);

// Create database connection
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

// Promisify common methods
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

// Export the database connection with promisified methods
const dbExports = {
  // Original SQLite3 database methods
  ...db,
  
  // Custom promisified methods
  run: dbMethods.run,
  get: dbMethods.get,
  all: dbMethods.all,
  
  // Keep all other methods from the original db object
  ...Object.getOwnPropertyNames(db)
    .filter(key => typeof db[key] === 'function' && !['run', 'get', 'all'].includes(key))
    .reduce((acc, key) => ({
      ...acc,
      [key]: db[key]
    }), {})
};

module.exports = dbExports;

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

// Create reviews table
const reviewTableSql = `CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(product_id) REFERENCES products(id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  UNIQUE(order_id, product_id, user_id)  -- Prevent duplicate reviews
)`;

db.run(reviewTableSql, (err) => {
  if (err) console.error('Error creating reviews table:', err.message);
  else console.log('Reviews table created or already exists');
});
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
  updateUser(id, name, role, address, password, cb) {
    // If password is provided, update it along with other fields
    if (typeof password === 'function') {
      // Handle case where password is not provided (backward compatibility)
      cb = password;
      db.run('UPDATE users SET name = ?, role = ?, address = ? WHERE id = ?', 
        [name, role, address, id], 
        function(err) {
          if (err) return cb(err);
          cb(null, { id, name, role, address });
        }
      );
    } else {
      // Update including password
      db.run('UPDATE users SET name = ?, role = ?, address = ?, password = ? WHERE id = ?', 
        [name, role, address, password, id], 
        function(err) {
          if (err) return cb(err);
          cb(null, { id, name, role, address });
        }
      );
    }
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
  // Start a transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // 1. First, check stock for all items
    const checkStock = (index, callback) => {
      if (index >= items.length) return callback(null);
      
      const item = items[index];
      db.get('SELECT stock_quantity FROM products WHERE id = ?', [item.product_id], (err, product) => {
        if (err) return callback(err);
        if (!product) {
          return callback(new Error(`ไม่พบสินค้ารหัส ${item.product_id}`));
        }
        if (product.stock_quantity < item.quantity) {
          return callback(new Error(`สินค้า ${item.product_id} มีไม่เพียงพอในสต็อก (เหลือเพียง ${product.stock_quantity} ชิ้น)`));
        }
        checkStock(index + 1, callback);
      });
    };

    // 2. If stock check passes, create order and reduce stock
    const createOrder = () => {
      db.run(
        'INSERT INTO orders (user_id, shipping_name, shipping_address) VALUES (?, ?, ?)',
        [userId, shippingName, shippingAddress],
        function(err) {
          if (err) return rollback(cb, err);
          
          const orderId = this.lastID;
          const stmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
          
          // Process each item
          let processed = 0;
          const totalItems = items.length;
          
          if (totalItems === 0) {
            return commit(cb, null, { id: orderId });
          }
          
          items.forEach((item, index) => {
            // Add to order items
            stmt.run(orderId, item.product_id, item.quantity, item.price, (err) => {
              if (err) return rollback(cb, err);
              
              // Reduce stock
              db.run(
                'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
                [item.quantity, item.product_id],
                (err) => {
                  if (err) return rollback(cb, err);
                  
                  processed++;
                  if (processed === totalItems) {
                    stmt.finalize((err) => {
                      if (err) return rollback(cb, err);
                      commit(cb, null, { id: orderId });
                    });
                  }
                }
              );
            });
          });
        }
      );
    };

    // Helper functions for transaction management
    const commit = (callback, err, result) => {
      db.run('COMMIT', (commitErr) => {
        if (commitErr || err) {
          return rollback(callback, commitErr || err);
        }
        callback(null, result);
      });
    };

    const rollback = (callback, err) => {
      db.run('ROLLBACK', () => {
        callback(err);
      });
    };

    // Start the process
    checkStock(0, (err) => {
      if (err) return rollback(cb, err);
      createOrder();
    });
  });
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
          if (err) return cb(err);
          
          // Reset category_id to NULL for products in this category
          db.run('UPDATE products SET category_id = NULL WHERE category_id = ?', [categoryId], function(err) {
            if (err) console.error('Error resetting category for products:', err);
            cb(null, { success: true });
          });
        });
      });
    });
  },

  // --- REVIEW SYSTEM ---
  // Add a review for a product in an order
  addReview(review, cb) {
    const { order_id, product_id, user_id, rating, comment } = review;
    
    console.log('=== Starting addReview ===');
    console.log('Review data:', { order_id, product_id, user_id, rating, comment });
    
    // First, verify the product exists
    db.get('SELECT id, title FROM products WHERE id = ?', [product_id], (err, product) => {
      if (err) {
        console.error('❌ Error checking product existence:', err);
        return cb(err);
      }
      
      if (!product) {
        const error = new Error(`Product ${product_id} not found`);
        console.error('❌', error.message);
        return cb(error);
      }
      
      console.log(`✅ Product found: ${product.title} (ID: ${product.id})`);
      
      // Check if review already exists
      db.get(
        'SELECT id FROM reviews WHERE order_id = ? AND product_id = ? AND user_id = ?',
        [order_id, product_id, user_id],
        (err, existingReview) => {
          if (err) {
            console.error('❌ Error checking for existing review:', err);
            return cb(err);
          }
          
          if (existingReview) {
            const error = new Error('คุณได้เขียนรีวิวสินค้านี้ไปแล้ว');
            console.error('❌', error.message);
            return cb(error);
          }
          
          console.log('✅ No duplicate review found, proceeding with insert...');
          
          // Insert the review
          const sql = `
            INSERT INTO reviews (
              order_id, 
              product_id, 
              user_id, 
              rating, 
              comment, 
              created_at
            ) VALUES (?, ?, ?, ?, ?, datetime('now'))
          `;
          
          console.log('Executing SQL:', sql);
          console.log('With values:', { order_id, product_id, user_id, rating, comment });
          
          db.run(
            sql,
            [order_id, product_id, user_id, rating, comment],
            function(err) {
              if (err) {
                console.error('❌ Error inserting review:', err);
                return cb(err);
              }
              
              const reviewId = this.lastID;
              console.log(`✅ Review ${reviewId} created successfully`);
              
              // Update the product's average rating
              console.log('Updating product rating...');
              db.get('SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE product_id = ?', 
                [product_id], 
                (err, row) => {
                  if (err) {
                    console.error('⚠️ Error calculating average rating:', err);
                    // Still return success since the review was created
                    return cb(null, { 
                      id: reviewId, 
                      warning: 'Review saved but could not update product rating' 
                    });
                  }
                  
                  console.log(`Calculated average rating: ${row.avg_rating} from ${row.review_count} reviews`);
                  
                  db.run('UPDATE products SET rating = ? WHERE id = ?', 
                    [row.avg_rating, product_id], 
                    (err) => {
                      if (err) {
                        console.error('⚠️ Error updating product rating:', err);
                        // Still return success since the review was created
                        return cb(null, { 
                          id: reviewId, 
                          warning: 'Review saved but could not update product rating' 
                        });
                      }
                      
                      console.log(`✅ Updated product ${product_id} rating to ${row.avg_rating}`);
                      console.log('=== Review process completed successfully ===\n');
                      cb(null, { id: reviewId });
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  },

  // Get reviews for a product
  getProductReviews(productId, cb) {
    db.all(
      `SELECT r.*, u.name as user_name 
       FROM reviews r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.product_id = ? 
       ORDER BY r.created_at DESC`,
      [productId],
      cb
    );
  },

  // Get user's reviews for an order
  getOrderReviewsByUser(orderId, userId, cb) {
    db.all(
      'SELECT * FROM reviews WHERE order_id = ? AND user_id = ?',
      [orderId, userId],
      cb
    );
  },

  // Check if user can review a product in an order
  canUserReviewProduct(orderId, productId, userId, cb) {
    console.log(`\n=== Review Permission Check Start ===`);
    console.log(`Order ID: ${orderId}, Product ID: ${productId}, User ID: ${userId}`);
    
    // First, check if the order exists and get its status
    db.get(
      `SELECT * FROM orders WHERE id = ?`,
      [orderId],
      (err, order) => {
        if (err) {
          console.error('Error fetching order:', err);
          return cb(err);
        }
        
        if (!order) {
          console.log(`❌ Order ${orderId} not found`);
          return cb(null, false);
        }
        
        console.log(`ℹ️ Order ${orderId} found. Status: ${order.status}`);
        
        // Check if order is delivered
        if (order.status !== 'delivered') {
          console.log(`❌ Order status is '${order.status}', not 'delivered'`);
          return cb(null, false);
        }
        
        // Check if the product is in the order
        db.get(
          `SELECT * FROM order_items WHERE order_id = ? AND product_id = ?`,
          [orderId, productId],
          (err, orderItem) => {
            if (err) {
              console.error('Error checking order items:', err);
              return cb(err);
            }
            
            if (!orderItem) {
              console.log(`❌ Product ${productId} not found in order ${orderId}`);
              return cb(null, false);
            }
            
            console.log(`✅ Product ${productId} is in order ${orderId}`);
            
            // Check if user owns the order
            if (order.user_id !== userId) {
              console.log(`❌ User ${userId} does not own order ${orderId}`);
              return cb(null, false);
            }
            
            console.log(`✅ User ${userId} owns order ${orderId}`);
            
            // Check if review already exists
            db.get(
              'SELECT * FROM reviews WHERE order_id = ? AND product_id = ? AND user_id = ?',
              [orderId, productId, userId],
              (err, existingReview) => {
                if (err) {
                  console.error('Error checking for existing review:', err);
                  return cb(err);
                }
                
                if (existingReview) {
                  console.log(`❌ Review already exists for order ${orderId}, product ${productId}`);
                  console.log('Existing review:', existingReview);
                  return cb(null, false);
                }
                
                console.log('✅ No existing review found');
                console.log('=== Review Permission Check: APPROVED ===\n');
                cb(null, true);
              }
            );
          }
        );
      }
    );
  }
};