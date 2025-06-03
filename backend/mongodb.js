const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection URI - Update this with your actual MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cursor_cart';

// Define schemas
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  address: String,
  role: { type: String, default: 'customer' },
  createdAt: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  image: String,
  category: String,
  stock: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shipping_name: { type: String, required: true },
  shipping_address: { type: String, required: true },
  status: { type: String, default: 'pending' },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  }],
  createdAt: { type: Date, default: Date.now }
});

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  createdAt: { type: Date, default: Date.now }
});

const reviewSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: String,
  is_anonymous: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Create models
const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);
const Category = mongoose.model('Category', categorySchema);
const Review = mongoose.model('Review', reviewSchema);

// Database connection
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log('Using existing database connection');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// User related functions
const getUserByEmail = async (email) => {
  return await User.findOne({ email });
};

const registerUser = async (email, password, name, role = 'customer', address = '') => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({
    email,
    password: hashedPassword,
    name,
    role,
    address
  });
  return await user.save();
};

// Product related functions
const getAllProducts = async () => {
  return await Product.find({});
};

const getProductById = async (id) => {
  return await Product.findById(id);
};

const addProduct = async (productData) => {
  const product = new Product(productData);
  return await product.save();
};

// Order related functions
const getAllOrders = async () => {
  return await Order.find({})
    .populate('user', 'email name')
    .populate('items.product', 'title price')
    .sort({ createdAt: -1 });
};

const getOrdersByUser = async (userId) => {
  return await Order.find({ user: userId })
    .populate('items.product', 'title price image')
    .sort({ createdAt: -1 });
};

// Export all functions
module.exports = {
  // Database connection
  connectDB,
  
  // User functions
  getUserByEmail,
  registerUser,
  
  // Product functions
  getAllProducts,
  getProductById,
  addProduct,
  
  // Order functions
  getAllOrders,
  getOrdersByUser,
  
  // Models (for advanced usage)
  models: {
    User,
    Product,
    Order,
    Category,
    Review
  }
};

// Note: This is a simplified version of the original db.js
// You'll need to add more functions to match all the functionality of db.js
// This is just a starting point for MongoDB integration.