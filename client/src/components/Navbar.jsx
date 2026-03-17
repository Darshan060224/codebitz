import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { LogoBolt } from './Icons';
import api from '../utils/api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user?.role === 'admin';
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || isAdmin) return;
    const fetchUnread = () => {
      api.get('/wallet/notifications').then(({ data }) => {
        setUnreadCount(data.notifications.filter((n) => !n.read).length);
      }).catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [user, isAdmin]);

  const bidderLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/auctions', label: 'Browse Auctions' },
    { to: '/wallet', label: 'Wallet' },
    { to: '/history', label: 'My Bids' },
    { to: '/notifications', label: 'Notifications', badge: unreadCount },
  ];

  const adminLinks = [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/create-auction', label: 'Create Auction' },
    { to: '/admin/auctions', label: 'Manage Auctions' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/credits', label: 'Credits' },
    { to: '/admin/reports', label: 'Reports' },
    { to: '/admin/health', label: '🛡️ Health' },
  ];

  const links = isAdmin ? adminLinks : bidderLinks;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50"
      style={{ background: 'rgba(6,5,26,.82)', backdropFilter: 'blur(18px) saturate(170%)', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <LogoBolt />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              KnockBet
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300"
                style={{
                  color: location.pathname === link.to ? '#c084fc' : '#94a3b8',
                  background: location.pathname === link.to ? 'rgba(124,58,237,.12)' : 'transparent',
                }}
                onMouseEnter={(e) => { if (location.pathname !== link.to) { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.background = 'rgba(255,255,255,.05)'; }}}
                onMouseLeave={(e) => { if (location.pathname !== link.to) { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}}
              >
                {link.label}
                {link.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none">
                    {link.badge > 9 ? '9+' : link.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* User + Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-cyan-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">{user?.name?.[0]}</span>
              </div>
              <div className="text-sm">
                <p className="font-medium text-slate-200">{user?.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm rounded-lg transition-all duration-300"
              style={{ background: 'rgba(239,68,68,.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,.2)' }}
            >
              Logout
            </button>
            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 text-slate-300"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden" style={{ borderTop: '1px solid rgba(255,255,255,.06)', background: 'rgba(6,5,26,.95)' }}>
          <div className="px-4 py-2 space-y-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className="relative flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium"
                style={{
                  color: location.pathname === link.to ? '#c084fc' : '#94a3b8',
                  background: location.pathname === link.to ? 'rgba(124,58,237,.12)' : 'transparent',
                }}
              >
                {link.label}
                {link.badge > 0 && (
                  <span className="w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {link.badge > 9 ? '9+' : link.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
