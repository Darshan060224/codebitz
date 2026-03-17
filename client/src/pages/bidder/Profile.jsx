import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../utils/helpers';
import api from '../../utils/api';

const API_HOST = 'http://localhost:5000';

function getImg(auction) {
  if (auction?.images?.length > 0) {
    const img = auction.images[0];
    return img.startsWith('/') ? `${API_HOST}${img}` : img;
  }
  return auction?.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600';
}

export default function Profile() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/auth/profile');
        setProfileData(data);
      } catch {
        // Profile fetch failed; show basic info
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const won = profileData?.wonAuctions || [];
  const interested = profileData?.interestedAuctions || [];
  const activeBids = profileData?.activeBids || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-100 mb-8 fu1">👤 Profile</h1>

      <div className="glass p-8 fu2">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-2xl flex items-center justify-center">
            <span className="text-white text-3xl font-bold">{user?.name?.[0]}</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-100">{user?.name}</h2>
            <p style={{ color: '#94a3b8' }}>{user?.email}</p>
            <span className="inline-block mt-1 text-xs font-bold px-3 py-1 rounded-full text-purple-300 capitalize" style={{ background: 'rgba(124,58,237,.15)' }}>
              {user?.role}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,.04)' }}>
            <p className="text-xs uppercase" style={{ color: '#64748b' }}>Total Credits</p>
            <p className="text-xl font-bold text-slate-100 mt-1">{formatINR(user?.credits || 0)}</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,.04)' }}>
            <p className="text-xs uppercase" style={{ color: '#64748b' }}>Locked Credits</p>
            <p className="text-xl font-bold text-orange-400 mt-1">{formatINR(user?.lockedCredits || 0)}</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,.04)' }}>
            <p className="text-xs uppercase" style={{ color: '#64748b' }}>Available</p>
            <p className="text-xl font-bold text-green-400 mt-1">{formatINR((user?.credits || 0) - (user?.lockedCredits || 0))}</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,.04)' }}>
            <p className="text-xs uppercase" style={{ color: '#64748b' }}>Auctions Won</p>
            <p className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent mt-1">{won.length}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner" /></div>
      ) : (
        <div className="mt-8 space-y-8">
          {/* Won Auctions */}
          <div className="fu3">
            <h2 className="text-xl font-bold text-slate-100 mb-4">🏆 My Wins</h2>
            {won.length === 0 ? (
              <div className="glass-card p-6 text-center" style={{ color: '#4b5563' }}>
                <p className="text-4xl mb-2">🎯</p>
                <p>No wins yet — keep bidding!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {won.map((a) => (
                  <Link key={a._id} to={`/auction/${a._id}`} className="glass-card overflow-hidden hover:scale-[1.02] transition-transform">
                    <img src={getImg(a)} alt={a.title} className="w-full h-32 object-cover" />
                    <div className="p-4">
                      <h3 className="font-semibold text-slate-100 truncate">{a.title}</h3>
                      <p className="text-sm font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent mt-1">
                        Won for {formatINR(a.currentBid)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Active Bids */}
          <div className="fu4">
            <h2 className="text-xl font-bold text-slate-100 mb-4">📈 Active Bids</h2>
            {activeBids.length === 0 ? (
              <div className="glass-card p-6 text-center" style={{ color: '#4b5563' }}>
                <p className="text-4xl mb-2">💤</p>
                <p>No active bids</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeBids.map((b) => (
                  <Link key={b.auctionId} to={`/auction/${b.auctionId}`} className="glass-card p-4 flex items-center gap-4 hover:scale-[1.01] transition-transform">
                    <img src={getImg(b)} alt={b.title} className="w-14 h-14 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-100 truncate">{b.title}</h3>
                      <p className="text-xs" style={{ color: '#94a3b8' }}>
                        Your bid: <span className="font-bold text-slate-200">{formatINR(b.myBid)}</span>
                        <span className="mx-2">·</span>
                        Current: <span className="font-bold">{formatINR(b.currentBid)}</span>
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      b.isWinning ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {b.isWinning ? '🏆 Winning' : '⚠️ Outbid'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Interested Auctions */}
          <div className="fu5">
            <h2 className="text-xl font-bold text-slate-100 mb-4">❤️ Interested Auctions</h2>
            {interested.length === 0 ? (
              <div className="glass-card p-6 text-center" style={{ color: '#4b5563' }}>
                <p className="text-4xl mb-2">💔</p>
                <p>No interested auctions — browse and add some!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {interested.map((a) => (
                  <Link key={a._id} to={`/auction/${a._id}`} className="glass-card overflow-hidden hover:scale-[1.02] transition-transform">
                    <img src={getImg(a)} alt={a.title} className="w-full h-32 object-cover" />
                    <div className="p-4">
                      <h3 className="font-semibold text-slate-100 truncate">{a.title}</h3>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                          {formatINR(a.currentBid)}
                        </p>
                        <span className="text-xs text-pink-400">❤️ {a.interestedUsers?.length || 0}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
