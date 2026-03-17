import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/helpers';
import AuctionCard from '../../components/AuctionCard';

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const [auctions, setAuctions] = useState([]);
  const [recentBids, setRecentBids] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  useEffect(() => {
    // Show onboarding for first-time users
    if (!localStorage.getItem('knockbet_onboarded')) {
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    refreshUser();
    const load = async () => {
      try {
        const [auctRes, bidRes, notifRes] = await Promise.all([
          api.get('/auctions', { params: { status: 'live' } }),
          api.get('/bids/history'),
          api.get('/wallet/notifications'),
        ]);
        setAuctions(auctRes.data.auctions.slice(0, 4));
        setRecentBids(bidRes.data.history.slice(0, 5));
        setNotifications(notifRes.data.notifications.slice(0, 5));
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  const stats = [
    { label: 'Available Credits', value: formatINR(user?.credits - (user?.lockedCredits || 0)), icon: '💰', color: 'from-green-400 to-emerald-500' },
    { label: 'Locked in Auctions', value: formatINR(user?.lockedCredits || 0), icon: '🔒', color: 'from-orange-400 to-red-500' },
    { label: 'Total Credits', value: formatINR(user?.credits || 0), icon: '💎', color: 'from-primary to-accent' },
    { label: 'Active Bids', value: recentBids.filter((b) => b.status === 'Winning').length, icon: '⚡', color: 'from-secondary to-blue-600' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Onboarding Tooltip */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(6,5,26,.85)' }}>
          <div className="glass p-8 rounded-3xl max-w-md mx-4 text-center animate-fade-in">
            {onboardingStep === 0 && (
              <>
                <p className="text-4xl mb-3">💰</p>
                <h3 className="text-xl font-bold text-slate-100 mb-2">Your Credit Balance</h3>
                <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>Credits are your bidding currency. You start with welcome credits — check your balance in the stats above.</p>
              </>
            )}
            {onboardingStep === 1 && (
              <>
                <p className="text-4xl mb-3">🔍</p>
                <h3 className="text-xl font-bold text-slate-100 mb-2">Browse Auctions</h3>
                <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>Head to the Marketplace to find live auctions. Enter a Battle Room to start bidding in real-time!</p>
              </>
            )}
            {onboardingStep === 2 && (
              <>
                <p className="text-4xl mb-3">⚔️</p>
                <h3 className="text-xl font-bold text-slate-100 mb-2">Battle Room</h3>
                <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>Inside the Battle Room, place bids, use KNOCK to pressure opponents, and chat with other bidders live!</p>
              </>
            )}
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i === onboardingStep ? 'bg-purple-400' : 'bg-white/20'}`} />
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowOnboarding(false);
                    localStorage.setItem('knockbet_onboarded', 'true');
                  }}
                  className="text-sm px-4 py-2 rounded-lg" style={{ color: '#94a3b8' }}
                >
                  Skip
                </button>
                <button
                  onClick={() => {
                    if (onboardingStep < 2) {
                      setOnboardingStep(onboardingStep + 1);
                    } else {
                      setShowOnboarding(false);
                      localStorage.setItem('knockbet_onboarded', 'true');
                    }
                  }}
                  className="btn-gradient px-6 py-2 text-sm"
                >
                  {onboardingStep < 2 ? 'Next' : 'Got it!'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="mb-8 fu1">
        <h1 className="text-3xl font-bold text-slate-100">Welcome, {user?.name}! 👋</h1>
        <p className="mt-1" style={{ color: '#64748b' }}>Here's what's happening in your auction world</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 fu2">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider" style={{ color: '#64748b' }}>{s.label}</p>
                <p className="text-2xl font-bold mt-1 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  {s.value}
                </p>
              </div>
              <span className="text-3xl">{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Live Auctions */}
      <div className="mb-8 fu3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-100">🔴 Live Auctions</h2>
          <Link to="/auctions" className="text-purple-400 text-sm font-medium hover:underline">View all →</Link>
        </div>
        {auctions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {auctions.map((a) => <AuctionCard key={a._id} auction={a} />)}
          </div>
        ) : (
          <div className="glass p-8 text-center" style={{ color: '#4b5563' }}>
            No live auctions right now
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6 fu4">
        {/* Recent Bids */}
        <div className="glass-card p-5">
          <h3 className="text-lg font-bold text-slate-100 mb-4">Recent Bids</h3>
          {recentBids.length === 0 ? (
            <p className="text-sm" style={{ color: '#4b5563' }}>No bids yet. Start bidding!</p>
          ) : (
            <div className="space-y-3">
              {recentBids.map((b) => (
                <Link key={b._id} to={`/auction/${b.auctionId}`} className="flex items-center justify-between py-2 rounded px-2 -mx-2" style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{b.auctionTitle}</p>
                    <p className="text-xs" style={{ color: '#64748b' }}>{formatINR(b.amount)}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    b.status === 'Winning' ? 'text-green-400' :
                    b.status === 'Won' ? 'text-emerald-400' :
                    b.status === 'Lost' ? 'text-red-400' :
                    'text-yellow-400'
                  }`} style={{ background: 'rgba(255,255,255,.06)' }}>
                    {b.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="glass-card p-5">
          <h3 className="text-lg font-bold text-slate-100 mb-4">Notifications</h3>
          {notifications.length === 0 ? (
            <p className="text-sm" style={{ color: '#4b5563' }}>No notifications</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div key={n._id} className={`py-2 ${n.read ? '' : 'rounded px-2 -mx-2'}`} style={{ borderBottom: '1px solid rgba(255,255,255,.05)', ...(n.read ? {} : { background: 'rgba(124,58,237,.08)' }) }}>
                  <p className="text-sm font-medium text-slate-200">{n.title}</p>
                  <p className="text-xs" style={{ color: '#64748b' }}>{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
