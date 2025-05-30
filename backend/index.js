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
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
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
  const { email, password, name, role } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'ข้อมูลไม่ครบ' });
  const userRole = role || 'customer';
  db.getUserByEmail(email, (err, user) => {
    if (err) {
      console.error('getUserByEmail error:', err);
      return res.status(500).json({ error: err.message });
    }
    if (user) return res.status(400).json({ error: 'อีเมลนี้ถูกใช้แล้ว' });
    const hash = bcrypt.hashSync(password, 10);
    db.registerUser(email, hash, name, userRole, (err, newUser) => {
      if (err) {
        console.error('registerUser error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'สมัครสมาชิกสำเร็จ', user: newUser });
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
  const { name, role } = req.body;
  if (!name) return res.status(400).json({ error: 'ข้อมูลไม่ครบ' });
  const newRole = role || req.user.role;
  db.updateUser(req.user.id, name, newRole, (err, updated) => {
    if (err) {
      console.error('updateUser error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'อัปเดตข้อมูลสำเร็จ', user: { id: req.user.id, email: req.user.email, name, role: newRole } });
  });
});

// GET /products (ดึงจาก sqlite ถ้าไม่มีรูปให้ใช้ mockup)
const axios = require('axios');
const MOCK_IMAGE = 'https://via.placeholder.com/200x200?text=No+Image';
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