const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const app = express();
const PORT = 4000;
const JWT_SECRET = 'your_jwt_secret';

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  db.get('SELECT 1', (err) => {
    if (err) {
      console.error('Database connection error:', err);
      return res.status(500).json({ status: 'error', message: 'Database connection failed' });
    }
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
});

// Middleware log
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// JWT Auth Middleware
function auth(req, res, next) {
  console.log(`[AUTH] ${req.method} ${req.url}`);
  console.log('[AUTH] Headers:', JSON.stringify(req.headers, null, 2));
  
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log('[AUTH] No Authorization header');
    return res.status(401).json({ error: 'No token' });
  }
  
  const token = authHeader.split(' ')[1];
  if (!token) {
    console.log('[AUTH] No token in Authorization header');
    return res.status(401).json({ error: 'No token provided' });
  }
  
  console.log('[AUTH] Verifying token...');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('[AUTH] Token verified. User:', JSON.stringify(decoded, null, 2));
    console.log(`[AUTH] User ID from token: ${decoded.id}, Type: ${typeof decoded.id}`);
    req.user = decoded;
    next();
  } catch (e) {
    console.error('[AUTH] Token verification failed:', e.message);
    console.error('[AUTH] Token content:', token);
    return res.status(401).json({ error: 'Invalid token', details: e.message });
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

// PUT /change-password
app.put('/change-password', auth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
  }
  
  // Get user from database
  db.getUserById(req.user.id, (err, user) => {
    if (err || !user) {
      return res.status(500).json({ error: 'ไม่พบผู้ใช้' });
    }
    
    // Verify current password
    bcrypt.compare(currentPassword, user.password, (err, isMatch) => {
      if (err || !isMatch) {
        return res.status(400).json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
      }
      
      // Hash new password
      bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
        if (err) {
          return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน' });
        }
        
        // Update password in database
        db.updateUser(req.user.id, user.name, user.role, user.address, hashedPassword, (err) => {
          if (err) {
            console.error('Error updating password:', err);
            return res.status(500).json({ error: 'ไม่สามารถเปลี่ยนรหัสผ่านได้' });
          }
          
          res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
        });
      });
    });
  });
});

// GET /products (ดึงจาก sqlite ถ้าไม่มีรูปให้ใช้ mockup)
const axios = require('axios');
const MOCK_IMAGE = 'https://via.placeholder.com/200x200?text=No+Image';

// --- REVIEW ENDPOINTS ---

// Submit a review for a product in an order
app.post('/api/reviews', auth, (req, res) => {
  try {
    console.log('=== Review Submission ===');
    console.log('User:', { id: req.user.id, email: req.user.email });
    console.log('Request body:', req.body);
    
    const { order_id, product_id, rating, comment, is_anonymous = false } = req.body;
    
    // Validate input
    if (!order_id || !product_id || typeof rating !== 'number' || rating < 1 || rating > 5) {
      const error = 'ข้อมูลรีวิวไม่ถูกต้อง';
      console.error('Validation failed:', { order_id, product_id, rating });
      return res.status(400).json({ 
        success: false,
        error 
      });
    }

    // Check if user can review this product in this order
    console.log(`Checking review permission for order ${order_id}, product ${product_id}, user ${req.user.id}`);
    db.canUserReviewProduct(order_id, product_id, req.user.id, (err, canReview) => {
      if (err) {
        console.error('Error checking review permission:', err);
        return res.status(500).json({ 
          success: false,
          error: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์',
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }
      
      if (!canReview) {
        console.error('Review not allowed:', { order_id, product_id, userId: req.user.id });
        return res.status(403).json({ 
          success: false,
          error: 'ไม่สามารถรีวิวสินค้านี้ได้' 
        });
      }

      console.log('Permission granted, adding review...');
      
      // Add the review
      db.addReview({
        order_id,
        product_id,
        user_id: req.user.id,
        rating,
        comment: comment || null,
        is_anonymous: Boolean(is_anonymous)  // Ensure it's a boolean value
      }, (err, result) => {
        if (err) {
          console.error('Error adding review:', err);
          return res.status(500).json({ 
            success: false,
            error: err.message || 'เกิดข้อผิดพลาดในการบันทึกรีวิว',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
          });
        }
        
        console.log('Review added successfully:', result);
        
        res.status(201).json({ 
          success: true, 
          message: 'บันทึกรีวิวเรียบร้อยแล้ว',
          reviewId: result.id,
          warning: result.warning
        });
      });
    });
  } catch (error) {
    console.error('Unexpected error in review submission:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get reviews for a product
app.get('/api/products/:productId/reviews', (req, res) => {
  const { productId } = req.params;
  
  db.getProductReviews(productId, (err, reviews) => {
    if (err) {
      console.error('Error fetching reviews:', err);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลรีวิว' });
    }
    
    res.json(reviews || []);
  });
});

// Get user's reviews for an order
app.get('/api/orders/:orderId/reviews', auth, (req, res) => {
  const { orderId } = req.params;
  
  db.getOrderReviewsByUser(orderId, req.user.id, (err, reviews) => {
    if (err) {
      console.error('Error fetching order reviews:', err);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลรีวิว' });
    }
    
    // Create a map of product_id to review for easy lookup
    const reviewMap = {};
    (reviews || []).forEach(review => {
      reviewMap[review.product_id] = review;
    });
    
    res.json(reviewMap);
  });
});

// Check if user can review a product in an order
app.get('/api/orders/:orderId/products/:productId/can-review', auth, (req, res) => {
  const { orderId, productId } = req.params;
  
  db.canUserReviewProduct(orderId, productId, req.user.id, (err, canReview) => {
    if (err) {
      console.error('Error checking review permission:', err);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' });
    }
    
    res.json({ canReview });
  });
});
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

// Get all products with optional category filter
app.get('/products', (req, res) => {
  const { category } = req.query;
  
  const callback = (err, products) => {
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
  };

  if (category) {
    db.getProductsByCategory(category, callback);
  } else {
    db.getAllProducts(callback);
  }
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
      stock_quantity: product.stock_quantity || 0, // Add stock_quantity if not exists
      // Include rating information in the format expected by the frontend
      rating: {
        rate: product.rating_rate || 0,
        count: product.rating_count || 0
      }
    };
    
    // Also include the rating at the root level for backward compatibility
    formattedProduct.rating_rate = product.rating_rate || 0;
    formattedProduct.rating_count = product.rating_count || 0;
    
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
// POST /check-stock - Check if items are in stock
app.post('/check-stock', auth, (req, res) => {
  const { items } = req.body;
  
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'ไม่มีสินค้าในรายการ' });
  }

  const checkPromises = items.map(item => {
    return new Promise((resolve) => {
      db.getProductById(item.product_id, (err, product) => {
        if (err || !product) {
          return resolve({
            product_id: item.product_id,
            valid: false,
            error: 'ไม่พบสินค้า'
          });
        }

        const availableQty = product.stock_quantity || 0;
        const requestedQty = item.quantity || 0;
        const isValid = availableQty >= requestedQty;
        
        resolve({
          product_id: item.product_id,
          title: product.title,
          requested: requestedQty,
          available: availableQty,
          valid: isValid
        });
      });
    });
  });

  Promise.all(checkPromises)
    .then(results => {
      const outOfStockItems = results.filter(r => !r.valid);
      const isValid = outOfStockItems.length === 0;
      
      res.json({
        isValid,
        results,
        outOfStockItems: outOfStockItems.map(item => ({
          product_id: item.product_id,
          title: item.title,
          requested: item.requested,
          available: item.available
        }))
      });
    })
    .catch(error => {
      console.error('Error checking stock:', error);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการตรวจสอบสต็อก' });
    });
});

// POST /orders
app.post('/orders', auth, (req, res) => {
  const { shipping_name, shipping_address, items } = req.body;
  console.log('[POST /orders] payload:', { shipping_name, shipping_address, items });
  if (!shipping_name || !shipping_address || !Array.isArray(items) || items.length === 0) {
    console.warn('[POST /orders] Reject: ข้อมูลไม่ครบหรือไม่มีสินค้าในคำสั่งซื้อ', { shipping_name, shipping_address, items });
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วนและมีสินค้าในคำสั่งซื้อ' });
  }
  
  // Validate items structure
  const invalidItems = items.filter(item => !item.product_id || !item.quantity || !item.price);
  if (invalidItems.length > 0) {
    console.warn('[POST /orders] Reject: รายการสินค้าไม่ถูกต้อง', { invalidItems });
    return res.status(400).json({ error: 'ข้อมูลสินค้าไม่ถูกต้อง' });
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
          product_title: row.product_title,
          product_image: row.product_image,
          quantity: row.quantity,
          price: row.price
        });
      }
    });
    
    // Convert to array and sort by created_at in descending order
    const sortedOrders = Object.values(orders).sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at);
    });
    
    res.json(sortedOrders);
  });
});

// DELETE /api/reviews/:id - Delete a review (admin only)
app.delete('/api/reviews/:id', auth, requireRole('admin'), async (req, res) => {
  console.log('=== DELETE /api/reviews/:id ===');
  console.log('Review ID:', req.params.id);
  console.log('User making request:', req.user);
  
  const reviewId = req.params.id;
  const db = require('./db2');
  
  if (!reviewId) {
    console.log('No review ID provided');
    return res.status(400).json({ 
      success: false,
      error: 'ต้องระบุ ID ของรีวิว' 
    });
  }

  // Get the review first to get the product_id
  let review;
  try {
    review = await db.get('SELECT * FROM reviews WHERE id = ?', [reviewId]);
    
    if (!review) {
      console.log('Review not found with ID:', reviewId);
      return res.status(404).json({ 
        success: false,
        error: 'ไม่พบรีวิวที่ต้องการลบ' 
      });
    }
    
    console.log('Found review:', JSON.stringify(review, null, 2));
  } catch (error) {
    console.error('Error finding review:', error);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการค้นหาข้อมูลรีวิว',
      details: error.message
    });
  }
  
  try {
    // Start a database transaction
    await db.run('BEGIN TRANSACTION');
    
    console.log('Deleting review...');
    
    // Delete the review
    await db.run('DELETE FROM reviews WHERE id = ?', [reviewId]);
    console.log(`Review ${reviewId} deleted successfully`);
    
    console.log('Review deleted, now updating product rating...');
    console.log('Product ID to update:', review.product_id);
    
    // Update the product's average rating
    const result = await db.get(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as rating_count FROM reviews WHERE product_id = ?',
      [review.product_id]
    );

    console.log('New rating calculation result:', JSON.stringify(result, null, 2));
    const newAvgRating = result && result.avg_rating !== null ? result.avg_rating : 0;
    const ratingCount = result && result.rating_count !== null ? result.rating_count : 0;

    console.log('Updating product with new rating:', JSON.stringify({ 
      productId: review.product_id,
      newAvgRating, 
      ratingCount 
    }, null, 2));

    // Update the product with new average rating and rating count
    await db.run(
      'UPDATE products SET rating_rate = ROUND(?, 2), rating_count = ? WHERE id = ?',
      [newAvgRating, ratingCount, review.product_id]
    );

    // Commit the transaction
    await db.run('COMMIT');
    
    console.log('Product rating updated successfully');
    return res.json({
      success: true,
      message: 'ลบรีวิวสำเร็จ',
      data: {
        reviewId,
        productId: review.product_id,
        newRating: newAvgRating,
        newReviewCount: ratingCount
      }
    });
    
  } catch (error) {
    // Try to rollback if there was an error
    try {
      await db.run('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }
    
    console.error('Error in review deletion transaction:', error);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการลบรีวิว',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/reviews - View all reviews (for debugging)
app.get('/api/reviews', (req, res) => {
  console.log('=== START: Fetching all reviews ===');
  
  // Query to get all reviews with user and product information
  const sql = `
    SELECT 
      r.id, 
      r.order_id,
      r.rating, 
      r.comment, 
      r.created_at,
      r.is_anonymous,
      CASE 
        WHEN r.is_anonymous = 1 THEN 
          CASE 
            WHEN LENGTH(u.name) <= 2 THEN u.name || '***' 
            ELSE SUBSTR(u.name, 1, 2) || REPLACE(SUBSTR(UPPER(u.name), 3), '.', '*') 
          END
        ELSE u.name 
      END as user_name,
      u.id as user_id,
      p.title as product_name,
      p.id as product_id
    FROM reviews r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN products p ON r.product_id = p.id
    ORDER BY r.created_at DESC
  `;
  
  console.log('Executing SQL query for reviews');
  
  // Use db.db.all to access the database connection directly
  db.db.all(sql, [], (err, reviews) => {
    if (err) {
      console.error('Error executing reviews query:', {
        message: err.message,
        code: err.code,
        stack: err.stack,
        sql: sql
      });
      return res.status(500).json({
        error: 'Failed to fetch reviews',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
        code: err.code,
        sqlError: true
      });
    }
    
    console.log(`Successfully fetched ${reviews?.length || 0} reviews`);
    res.json(reviews || []);
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

// Test endpoint to verify JWT is working
app.get('/test-auth', auth, (req, res) => {
  res.json({ 
    message: 'You are authenticated!',
    user: req.user
  });
});

// Test endpoint to verify database connection and permissions
app.get('/test-db', (req, res) => {
  console.log('Testing database connection and permissions...');
  
  // Simple test to check if the endpoint is reachable
  res.json({
    success: true,
    message: 'Test endpoint is working',
    tests: [
      { name: 'endpoint_reachable', status: 'passed' },
      { name: 'database_connection', status: 'pending' },
      { name: 'reviews_table', status: 'pending' }
    ]
  });
});

// Simple test endpoint for database connection
app.get('/test-db-connection', async (req, res) => {
  console.log('Testing database connection...');
  
  try {
    // Use the new database connection
    const db = require('./db2');
    
    if (!db) {
      console.error('Database instance is not available');
      return res.status(500).json({
        success: false,
        error: 'Database instance is not available'
      });
    }
    
    try {
      console.log('Executing test query...');
      const row = await db.get('SELECT 1 as test');
      console.log('Database connection test passed:', row);
      
      res.json({
        success: true,
        message: 'Database connection is working',
        data: row
      });
    } catch (dbError) {
      console.error('Database connection test failed:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Database query failed',
        details: dbError.message,
        stack: process.env.NODE_ENV === 'development' ? dbError.stack : undefined
      });
    }
  } catch (error) {
    console.error('Error in test-db-connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test database connection',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Test endpoint for reviews table
app.get('/test-reviews-table', async (req, res) => {
  console.log('Testing reviews table...');
  
  try {
    const db = require('./db2');
    
    try {
      // First check if table exists
      const table = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='reviews'");
      
      if (!table) {
        console.log('Reviews table does not exist');
        return res.status(404).json({
          success: false,
          error: 'Reviews table does not exist'
        });
      }
      
      console.log('Reviews table exists, checking data...');
      
      // If table exists, try to query it
      const rows = await db.all('SELECT * FROM reviews LIMIT 5');
      console.log(`Found ${rows.length} reviews`);
      
      // Get table structure
      const columns = await db.all('PRAGMA table_info(reviews)');
      console.log('Table structure:', columns);
      
      res.json({
        success: true,
        message: 'Reviews table is accessible',
        tableExists: true,
        reviewCount: rows.length,
        columns: columns.map(c => c.name),
        sampleData: rows
      });
      
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Database operation failed',
        details: dbError.message,
        stack: process.env.NODE_ENV === 'development' ? dbError.stack : undefined
      });
    }
  } catch (error) {
    console.error('Error in test-reviews-table:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test reviews table',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
console.error('Global error handler:', err);
res.status(500).json({ error: 'Internal server error' });
});

// --- CATEGORY ROUTES ---
// Get all categories (public)
app.get('/categories', (req, res) => {
db.getAllCategories((err, categories) => {
if (err) {
console.error('Error fetching categories:', err);
return res.status(500).json({ error: 'Failed to fetch categories' });
}
res.json(categories);
});
});

// Get single category (public)
app.get('/categories/:id', (req, res) => {
const categoryId = req.params.id;
db.getCategoryById(categoryId, (err, category) => {
if (err) {
if (err.status) return res.status(err.status).json({ error: err.message });
console.error('Error fetching category:', err);
return res.status(500).json({ error: 'Failed to fetch category' });
}
res.json(category);
});
});

// Create new category (admin only)
app.post('/categories', auth, requireRole('admin'), (req, res) => {
const { categoryName, categoryNote } = req.body;

if (!categoryName) {
return res.status(400).json({ error: 'Category name is required' });
}

db.createCategory({ categoryName, categoryNote }, (err, category) => {
if (err) {
if (err.status) return res.status(err.status).json({ error: err.message });
console.error('Error creating category:', err);
return res.status(500).json({ error: 'Failed to create category' });
}
res.status(201).json(category);
});
});

// Update category (admin only)
app.put('/categories/:id', auth, requireRole('admin'), (req, res) => {
const categoryId = req.params.id;
const { categoryName, categoryNote } = req.body;

if (!categoryName) {
return res.status(400).json({ error: 'Category name is required' });
}

db.updateCategory(categoryId, { categoryName, categoryNote }, (err, category) => {
if (err) {
if (err.status) return res.status(err.status).json({ error: err.message });
console.error('Error updating category:', err);
return res.status(500).json({ error: 'Failed to update category' });
}
res.json(category);
});
});

// Delete category (admin only)
app.delete('/categories/:id', auth, requireRole('admin'), (req, res) => {
const categoryId = req.params.id;

db.deleteCategory(categoryId, (err, result) => {
if (err) {
if (err.status) return res.status(err.status).json({ error: err.message });
console.error('Error deleting category:', err);
return res.status(500).json({ error: 'Failed to delete category' });
}
res.json({ message: 'Category deleted successfully' });
});
});

// Start the server
app.listen(PORT, () => {
console.log(`Server running on http://localhost:${PORT}`);
});