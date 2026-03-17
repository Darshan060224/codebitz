import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';

// Layouts
import Navbar from './components/Navbar';
import SpaceBG from './components/SpaceBG';

// Public
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';

// Bidder
import Dashboard from './pages/bidder/Dashboard';
import Marketplace from './pages/Marketplace';
import AuctionDetail from './pages/AuctionDetail';
import Wallet from './pages/bidder/Wallet';
import BidHistory from './pages/bidder/BidHistory';
import Profile from './pages/bidder/Profile';
import Notifications from './pages/bidder/Notifications';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import CreateAuction from './pages/admin/CreateAuction';
import ManageAuctions from './pages/admin/ManageAuctions';
import ManageUsers from './pages/admin/ManageUsers';
import Credits from './pages/admin/Credits';
import Reports from './pages/admin/Reports';
import AdminAuctionMonitor from './pages/admin/AdminAuctionMonitor';
import SystemHealth from './pages/admin/SystemHealth';

function ProtectedRoute({ children, adminOnly }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen relative" style={{ background: '#06051a' }}>
      <SpaceBG />
      <Toaster position="top-right" toastOptions={{
        duration: 3000,
        style: { background: 'rgba(255,255,255,.08)', backdropFilter: 'blur(16px)', color: '#f1f5f9', border: '1px solid rgba(255,255,255,.11)', borderRadius: 14 },
      }} />
      <div className="relative z-10">
        {user && <Navbar />}
        <main className={user ? 'pt-16' : ''}>
          <Routes>
          {/* Public */}
          <Route path="/" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} /> : <Landing />} />
          <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />

          {/* Marketplace (accessible to all logged in) */}
          <Route path="/auctions" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
          <Route path="/auction/:id" element={<ProtectedRoute><AuctionDetail /></ProtectedRoute>} />

          {/* Bidder */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><BidHistory /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/create-auction" element={<ProtectedRoute adminOnly><CreateAuction /></ProtectedRoute>} />
          <Route path="/admin/auctions" element={<ProtectedRoute adminOnly><ManageAuctions /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute adminOnly><ManageUsers /></ProtectedRoute>} />
          <Route path="/admin/credits" element={<ProtectedRoute adminOnly><Credits /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />
          <Route path="/admin/auction/:id" element={<ProtectedRoute adminOnly><AdminAuctionMonitor /></ProtectedRoute>} />
          <Route path="/admin/health" element={<ProtectedRoute adminOnly><SystemHealth /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
    </div>
  );
}
