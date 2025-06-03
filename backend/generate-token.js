const jwt = require('jsonwebtoken');

// Use the same secret as in your index.js
const JWT_SECRET = 'your_jwt_secret';

// Create a test admin token
const adminToken = jwt.sign(
  { 
    id: 3, 
    email: 'a@a.com',
    role: 'admin',
    name: 'Admin User'
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('Admin Token:', adminToken);
