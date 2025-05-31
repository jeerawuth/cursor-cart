import { Routes, Route, Navigate } from 'react-router-dom';
import Home from '../pages/Home';
import ProductList from '../pages/ProductList';
import ProductDetail from '../pages/ProductDetail';
import Cart from '../pages/Cart';
import Checkout from '../pages/Checkout';
import Login from '../pages/Login';
import Profile from '../pages/Profile';
import AdminLogin from '../admin/AdminLogin';
import AdminDashboard from '../admin/AdminDashboard';
import AdminProductManager from '../admin/AdminProductManager';
import AdminUsersManager from '../admin/AdminUsersManager';
import Orders from '../pages/Orders';
import AdminOrderManager from '../admin/AdminOrderManager';
import EditProfile from '../pages/EditProfile';
import Signup from '../pages/Signup';
import { useAuthStore } from '../store/authStore';

function AdminRoute({ children }) {
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);
  console.log('[AdminRoute] user:', user);
  // ถ้ายังมี token แต่ user ยังไม่โหลด (null) ให้แสดง loading
  if (token && user === null) {
    return <div>Loading...</div>;
  }
  if (!user || user.role !== 'admin') {
    console.log('[AdminRoute] redirect: user not admin');
    return <Navigate to="/" replace />;
  }
  console.log('[AdminRoute] access granted');
  return children;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/products" element={<ProductList />} />
    <Route path="/product/:id" element={<ProductDetail />} />
    <Route path="/cart" element={<Cart />} />
    <Route path="/checkout" element={<Checkout />} />
    <Route path="/login" element={<Login />} />
    <Route path="/profile" element={<Profile />} />
    <Route path="/admin/login" element={<AdminLogin />} />
    <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
    <Route path="/admin/products" element={<AdminRoute><AdminProductManager /></AdminRoute>} />
    <Route path="/admin/orders" element={<AdminRoute><AdminOrderManager /></AdminRoute>} />
    <Route path="/admin/users" element={<AdminRoute><AdminUsersManager /></AdminRoute>} />
    <Route path="/orders" element={<Orders />} />
    <Route path="/edit-profile" element={<EditProfile />} />
    <Route path="/signup" element={<Signup />} />
  </Routes>
);

export default AppRoutes;
