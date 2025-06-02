const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const app = express();
const PORT = 4000;
const JWT_SECRET = 'your_jwt_secret';

app.use(cors());
app.use(express.json());

// Middleware log
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// JWT Auth Middleware
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log('[AUTH] No Authorization header');
    return res.status(401).json({ error: 'No token' });
  }
  const token = authHeader.split(' ')[1];
  console.log('[AUTH] Got token:', token);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    console.log('[AUTH] Invalid token:', token, '| Error:', e.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Middleware ตรวจสอบ role
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

// POST /register
app.post('/register', (req, res) => {
  const { email, password, name, role, address = '' } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'ข้อมูลไม่ครบ' });
  const userRole = role || 'customer';
  
  db.getUserByEmail(email, (err, user) => {
    if (err) {
      console.error('getUserByEmail error:', err);
      return res.status(500).json({ error: err.message });
    }
    if (user) return res.status(400).json({ error: 'อีเมลนี้ถูกใช้แล้ว' });
    
    const hash = bcrypt.hashSync(password, 10);
    db.registerUser(email, hash, name, userRole, address, (err, newUser) => {
      if (err) {
        console.error('registerUser error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ 
        message: 'สมัครสมาชิกสำเร็จ', 
        user: newUser 
      });
    });
  });
});

// POST /login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'ข้อมูลไม่ครบ' });
  db.getUserByEmail(email, (err, user) => {
    if (err) {
      console.error('getUserByEmail error:', err);
      return res.status(500).json({ error: err.message });
    }
    if (!user) return res.status(400).json({ error: 'ไม่พบผู้ใช้' });
    if (!bcrypt.compareSync(password, user.password)) return res.status(400).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'เข้าสู่ระบบสำเร็จ', token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  });
});

// GET /profile
app.get('/profile', auth, (req, res) => {
  db.getUserById(req.user.id, (err, user) => {
    if (err) {
      console.error('getUserById error:', err);
      return res.status(500).json({ error: err.message });
    }
    if (!user) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    res.json(user);
  });
});

// PUT /profile
app.put('/profile', auth, (req, res) => {
  const { name, role, address } = req.body;
  if (!name) return res.status(400).json({ error: 'ข้อมูลไม่ครบ' });
  const newRole = role || req.user.role;
  
  db.updateUser(req.user.id, name, newRole, address, (err, updated) => {
    if (err) {
      console.error('updateUser error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    // After updating, fetch the complete user data
    db.getUserById(req.user.id, (err, user) => {
      if (err) {
        console.error('Error fetching updated user:', err);
        return res.status(500).json({ error: 'Error fetching updated user data' });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'ไม่พบผู้ใช้หลังจากอัปเดต' });
      }
      
      // Return the complete user data
      res.json({
        message: 'อัปเดตข้อมูลสำเร็จ',
        ...user
      });
    });
  });
});

// GET /products (ดึงจาก sqlite ถ้าไม่มีรูปให้ใช้ mockup)
const axios = require('axios');
const MOCK_IMAGE = 'https://via.placeholder.com/200x200?text=No+Image';
// Debug endpoint to check products table structure
app.get('/debug/products/table-structure', (req, res) => {
  db.all("PRAGMA table_info(products)", [], (err, columns) => {
    if (err) {
      console.error('Error getting table structure:', err);
      return res.status(500).json({ error: 'Failed to get table structure' });
    }
    res.json(columns);
  });
});

// Debug endpoint to get all products with their raw data
app.get('/debug/products/all', (req, res) => {
  db.all('SELECT * FROM products', [], (err, products) => {
    if (err) {
      console.error('Error getting products:', err);
      return res.status(500).json({ error: 'Failed to get products' });
    }
    res.json(products);
  });
});

// Get all products
app.get('/products', (req, res) => {
  db.getAllProducts((err, products) => {
    if (err) {
      console.error('Error fetching products from sqlite:', err.message);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }
    // ถ้ารูปภาพว่างหรือ null ให้ใช้ mockup
    const mapped = products.map(p => ({
      ...p,
      image: p.image ? p.image : MOCK_IMAGE,
      rating: {
        rate: p.rating_rate,
        count: p.rating_count
      }
    }));
    res.json(mapped);
  });
});

// Get single product by ID
app.get('/products/:id', (req, res) => {
  const productId = req.params.id;
  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }
  
  db.getProductById(productId, (err, product) => {
    if (err) {
      console.error('Error fetching product:', err.message);
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Format the response to match the frontend expectations
    const formattedProduct = {
      ...product,
      name: product.title, // Map title to name for frontend
      image_url: product.image || MOCK_IMAGE, // Use image_url for frontend
      stock_quantity: product.stock_quantity || 0 // Add stock_quantity if not exists
    };
    
    res.json(formattedProduct);
  });
});

// POST /products - เพิ่มสินค้าใหม่
app.post('/products', (req, res) => {
  const { title, price, description, category, image, rating_rate, rating_count } = req.body;
  if (!title || price == null) return res.status(400).json({ error: 'กรุณาระบุชื่อสินค้าและราคา' });
  db.addProduct({ title, price, description, category, image, rating_rate, rating_count }, (err, product) => {
    if (err) {
      console.error('Error adding product:', err.message);
      return res.status(500).json({ error: 'Failed to add product' });
    }
    res.status(201).json(product);
  });
});

// PUT /products/:id - แก้ไขสินค้า
app.put('/products/:id', (req, res) => {
  const id = req.params.id;
  const { title, price, description, category, image, rating_rate, rating_count, stock_quantity } = req.body;
  if (!title || price == null) return res.status(400).json({ error: 'กรุณาระบุชื่อสินค้าและราคา' });
  db.updateProduct(id, { 
    title, 
    price, 
    description, 
    category, 
    image, 
    rating_rate, 
    rating_count, 
    stock_quantity: stock_quantity !== undefined ? stock_quantity : 0 
  }, (err, product) => {
    if (err) {
      console.error('Error updating product:', err.message);
      return res.status(500).json({ error: 'Failed to update product' });
    }
    res.json(product);
  });
});

// --- CART ENDPOINTS ---
// GET /cart - ดึง cart ของ user
app.get('/cart', auth, (req, res) => {
  db.getCartByUserId(req.user.id, (err, items) => {
    if (err) {
      console.error('getCartByUserId error:', err);
      return res.status(500).json({ error: 'ไม่สามารถดึง cart ได้' });
    }
    console.log('GET /cart for user', req.user.id, '->', items);
    res.json({ items });
  });
});

// PUT /cart - อัปเดต cart ของ user
app.put('/cart', auth, (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items ต้องเป็น array' });
  db.upsertCart(req.user.id, items, (err) => {
    if (err) {
      console.error('upsertCart error:', err);
      return res.status(500).json({ error: 'ไม่สามารถบันทึก cart ได้' });
    }
    res.json({ message: 'บันทึก cart สำเร็จ' });
  });
});

// DELETE /cart - เคลียร์ cart ของ user
app.delete('/cart', auth, (req, res) => {
  db.clearCart(req.user.id, (err) => {
    if (err) {
      console.error('clearCart error:', err);
      return res.status(500).json({ error: 'ไม่สามารถลบ cart ได้' });
    }
    res.json({ message: 'ลบ cart สำเร็จ' });
  });
});

// DELETE /products/:id - ลบสินค้า
app.delete('/products/:id', (req, res) => {
  const id = req.params.id;
  db.deleteProduct(id, (err) => {
    if (err) {
      console.error('Error deleting product:', err.message);
      return res.status(500).json({ error: 'Failed to delete product' });
    }
    res.json({ message: 'ลบสินค้าสำเร็จ', id });
  });
});

// --- ORDER SYSTEM ---
// POST /orders - สร้างคำสั่งซื้อ (เฉพาะผู้ใช้ล็อกอิน)
app.post('/orders', auth, (req, res) => {
  const { shipping_name, shipping_address, items } = req.body;
  console.log('[POST /orders] payload:', { shipping_name, shipping_address, items });
  if (!shipping_name || !shipping_address || !Array.isArray(items) || items.length === 0) {
    console.warn('[POST /orders] Reject: ข้อมูลไม่ครบหรือไม่มีสินค้าในคำสั่งซื้อ', { shipping_name, shipping_address, items });
    return res.status(400).json({ error: 'ข้อมูลไม่ครบหรือไม่มีสินค้าในคำสั่งซื้อ' });
  }
  db.addOrder(req.user.id, shipping_name, shipping_address, items, (err, order) => {
    if (err) {
      console.error('[POST /orders] addOrder error:', err, '\nuser:', req.user, '\npayload:', { shipping_name, shipping_address, items });
      return res.status(500).json({ error: 'ไม่สามารถสร้างคำสั่งซื้อได้', detail: err.message });
    }
    console.log('[POST /orders] Order created:', order);
    res.status(201).json({ message: 'สร้างคำสั่งซื้อสำเร็จ', order });
  });
});

// GET /orders - ดูคำสั่งซื้อของตนเอง
app.get('/orders', auth, (req, res) => {
  console.log('[GET /orders] user.id:', req.user.id);
  db.getOrdersByUser(req.user.id, (err, rows) => {
    if (err) {
      console.error('getOrdersByUser error:', err);
      return res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลคำสั่งซื้อ' });
    }
    console.log('[GET /orders] raw rows:', rows);
    // รวมกลุ่ม order_items ตาม order
    const orders = {};
    rows.forEach(row => {
      if (!orders[row.id]) {
        orders[row.id] = {
          id: row.id,
          shipping_name: row.shipping_name,
          shipping_address: row.shipping_address,
          status: row.status,
          created_at: row.created_at,
          items: []
        };
      }
      if (row.item_id) {
        orders[row.id].items.push({
          id: row.item_id,
          product_id: row.product_id,
          quantity: row.quantity,
          price: row.price
        });
      }
    });
    res.json(Object.values(orders));
  });
});

// GET /admin/orders - ดูคำสั่งซื้อทั้งหมด (admin เท่านั้น)
// Get all users (admin only)
app.get('/admin/users', auth, requireRole('admin'), (req, res) => {
  db.getAllUsers((err, users) => {
    if (err) {
      console.error('getAllUsers error:', err);
      return res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลผู้ใช้' });
    }
    res.json(users);
  });
});

// Delete user (admin only)
app.delete('/admin/users/:id', auth, requireRole('admin'), (req, res) => {
  const requestId = Math.random().toString(36).substr(2, 9);
  const log = (message, data = '') => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${requestId}] ${message}`, data);
  };
  
  log('Delete user request received', { userId: req.params.id, user: req.user });
  const userId = req.params.id;
  console.log(`[DELETE /admin/users/${userId}] Received delete request`);
  
  if (!userId || isNaN(parseInt(userId))) {
    console.error('Invalid user ID:', userId);
    return res.status(400).json({ error: 'Invalid user ID', details: `Received: ${userId}` });
  }
  
  // First check if this is the last admin
  log('Fetching user from database');
  db.getUserById(userId, (err, user) => {
    if (err) {
      console.error('Error getting user:', err);
      return res.status(500).json({ 
        error: 'Failed to verify user',
        details: err.message 
      });
    }
    
    if (!user) {
      console.error('User not found with ID:', userId);
      return res.status(404).json({ 
        error: 'User not found',
        userId: userId
      });
    }
    
    console.log(`Found user to delete:`, { id: user.id, email: user.email, role: user.role });
    
    log('User found', { userId: user.id, role: user.role });
    
    if (user.role === 'admin') {
      log('User is an admin, checking admin count');
      console.log('User is an admin, checking if last admin...');
      // Check if this is the last admin
      log('Fetching all users to check admin count');
      db.getAllUsers((err, users) => {
        if (err) {
          console.error('Error getting all users:', err);
          return res.status(500).json({ 
            error: 'Failed to verify admin users',
            details: err.message
          });
        }
        
        const adminCount = users.filter(u => u.role === 'admin').length;
        log('Admin count', { adminCount, totalUsers: users.length });
        console.log(`Found ${adminCount} admin users in the system`);
        
        if (adminCount <= 1) {
          const errorMsg = 'ไม่สามารถลบผู้ดูแลระบบได้ เนื่องจากเป็นผู้ดูแลระบบคนสุดท้าย';
          console.error(errorMsg);
          return res.status(400).json({ 
            error: errorMsg,
            adminCount
          });
        }
        
        // Proceed with deletion if not the last admin
        console.log('Proceeding with admin user deletion...');
        deleteUser();
      });
    } else {
      // Proceed with deletion for non-admin users
      console.log('Proceeding with non-admin user deletion...');
      deleteUser();
    }
  });
  
  function deleteUser() {
    log('Starting user deletion process');
    console.log(`Attempting to delete user with ID: ${userId}`);
    log('Calling deleteUser database function');
    db.deleteUser(userId, (err, result) => {
      if (err) {
        console.error('Error in deleteUser:', err);
        return res.status(500).json({ 
          error: 'Failed to delete user',
          details: err.message,
          stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
      }
      log('User deleted successfully', { userId });
      res.json({ 
        success: true, 
        message: 'ลบผู้ใช้เรียบร้อยแล้ว',
        userId: userId,
        requestId: requestId
      });
    });
  }
});

// Update user role (admin only)
app.put('/admin/users/:id/role', auth, requireRole('admin'), (req, res) => {
  console.log('Role update request received:', req.params.id, req.body);
  const { role } = req.body;
  const userId = req.params.id;
  
  if (!role || !['admin', 'customer'].includes(role)) {
    console.error('Invalid role provided:', role);
    return res.status(400).json({ error: 'Invalid role', received: role });
  }
  
  if (!userId || isNaN(parseInt(userId))) {
    console.error('Invalid user ID:', userId);
    return res.status(400).json({ error: 'Invalid user ID', received: userId });
  }
  
  console.log(`Updating user ${userId} role to ${role}`);
  
  // Use the database helper function
  db.updateUserRole(userId, role, (err, updatedUser) => {
    if (err) {
      console.error('Error updating user role:', err);
      return res.status(500).json({ 
        error: 'Database error when updating role',
        details: err.message 
      });
    }
    
    if (!updatedUser) {
      console.error('User not found with ID:', userId);
      return res.status(404).json({ 
        error: 'User not found',
        userId: userId
      });
    }
    
    console.log('Successfully updated user role:', updatedUser);
    res.json({ 
      message: 'Role updated successfully',
      user: updatedUser
    });
  });
});

app.get('/admin/orders', auth, requireRole('admin'), (req, res) => {
  db.getAllOrders((err, rows) => {
    if (err) {
      console.error('getAllOrders error:', err);
      return res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลคำสั่งซื้อ' });
    }
    // รวมกลุ่ม order_items ตาม order
    const orders = {};
    rows.forEach(row => {
      if (!orders[row.id]) {
        orders[row.id] = {
          id: row.id,
          user_id: row.user_id,
          user_email: row.user_email,
          shipping_name: row.shipping_name,
          shipping_address: row.shipping_address,
          status: row.status,
          created_at: row.created_at,
          items: []
        };
      }
      if (row.item_id) {
        orders[row.id].items.push({
          id: row.item_id,
          product_id: row.product_id,
          quantity: row.quantity,
          price: row.price
        });
      }
    });
    res.json(Object.values(orders));
  });
});

// PUT /admin/orders/:id - อัปเดตสถานะคำสั่งซื้อ (admin เท่านั้น)
app.put('/admin/orders/:id', auth, requireRole('admin'), (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'กรุณาระบุสถานะใหม่' });
  db.updateOrderStatus(req.params.id, status, (err, result) => {
    if (err) {
      console.error('updateOrderStatus error:', err);
      return res.status(500).json({ error: 'ไม่สามารถอัปเดตสถานะคำสั่งซื้อ' });
    }
    res.json({ message: 'อัปเดตสถานะสำเร็จ', result });
  });
});

// ตัวอย่าง route /admin (อนุญาตเฉพาะ admin)
app.get('/admin', auth, requireRole('admin'), (req, res) => {
  res.json({ message: 'Welcome admin!', user: req.user });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
}); 