import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatINR, getTimeLeft, getTimeTo, getHeatEmoji, getStatusColor } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const API_HOST = 'http://localhost:5000';

function getImageUrl(auction) {
  if (auction.images?.length > 0) {
    const img = auction.images[0];
    return img.startsWith('/') ? `${API_HOST}${img}` : img;
  }
  return auction.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600';
}

// Returns timer color class based on urgency level
function getTimerStyle(seconds, status) {
  if (status !== 'live') return { color: '#94a3b8', animation: '' };
  if (seconds <= 10) return { color: '#ef4444', animation: 'animate-pulse-fast', flash: true };
  if (seconds <= 30) return { color: '#ef4444', animation: 'animate-pulse-fast' };
  if (seconds <= 120) return { color: '#f59e0b', animation: '' };
  return { color: '#94a3b8', animation: '' };
}

export default function AuctionCard({ auction: initialAuction }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [auction, setAuction] = useState(initialAuction);
  const [timeDisplay, setTimeDisplay] = useState('');
  const [timerStyle, setTimerStyle] = useState({ color: '#94a3b8', animation: '' });
  const [imgIdx, setImgIdx] = useState(0);
  const [interested, setInterested] = useState(
    () => auction.interestedUsers?.includes(user?._id) || false
  );
  const [interestedCount, setInterestedCount] = useState(auction.interestedUsers?.length || 0);
  const [interestLoading, setInterestLoading] = useState(false);

  useEffect(() => {
    setAuction(initialAuction);
  }, [initialAuction]);

  useEffect(() => {
    const update = () => {
      if (auction.status === 'upcoming') {
        const t = getTimeTo(auction.startTime);
        setTimeDisplay(t.started ? 'Starting...' : `Starts in ${t.text}`);
        setTimerStyle({ color: '#38bdf8', animation: '' });
      } else if (auction.status === 'live') {
        const t = getTimeLeft(auction.endTime);
        setTimeDisplay(t.seconds <= 0 ? 'Ending...' : `${t.text} left`);
        setTimerStyle(getTimerStyle(t.seconds, auction.status));
      } else {
        setTimeDisplay('Ended');
        setTimerStyle({ color: '#4b5563', animation: '' });
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [auction.status, auction.startTime, auction.endTime]);

  const allImages = auction.images?.length > 0
    ? auction.images.map((img) => img.startsWith('/') ? `${API_HOST}${img}` : img)
    : [auction.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'];

  const isBattle = auction.status === 'live' && auction.heatLevel === 'hot';

  const handleInterest = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    if (interestLoading) return;
    setInterestLoading(true);
    try {
      const { data } = await api.post(`/auctions/${auction._id}/interested`);
      setInterested(data.interested);
      setInterestedCount(data.count);
    } catch {
      /* silent */
    } finally {
      setInterestLoading(false);
    }
  };

  return (
    <Link
      to={`/auction/${auction._id}`}
      className="block glass-card overflow-hidden"
    >
      {/* Image */}
      <div className="relative overflow-hidden h-48">
        <img
          src={allImages[imgIdx]}
          alt={auction.title}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(transparent 50%, rgba(6,5,26,.7))' }} />

        {/* Image dots */}
        {allImages.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {allImages.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); setImgIdx(i); }}
                className={`w-2 h-2 rounded-full transition-all ${i === imgIdx ? 'bg-white scale-125' : 'bg-white/40'}`}
              />
            ))}
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          <span className={`${getStatusColor(auction.status)} text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider`}>
            {auction.status}
          </span>
          {/* Battle badge */}
          {isBattle && (
            <span className="text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse-fast"
              style={{ background: 'linear-gradient(135deg,#ef4444,#f97316)', boxShadow: '0 0 10px rgba(239,68,68,.5)' }}>
              ⚔️ Battle Live
            </span>
          )}
        </div>

        {/* Heat meter */}
        {auction.status === 'live' && auction.heatLevel !== 'calm' && (
          <div className="absolute top-3 right-3 text-white text-xs font-bold px-2 py-1 rounded-full"
            style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(8px)' }}>
            {getHeatEmoji(auction.heatLevel)}
          </div>
        )}

        {/* Interested / Watchlist button */}
        <button
          onClick={handleInterest}
          title={interested ? 'Remove from watchlist' : 'Add to watchlist'}
          className="absolute bottom-8 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 z-10"
          style={{
            background: interested ? 'rgba(236,72,153,.9)' : 'rgba(0,0,0,.5)',
            backdropFilter: 'blur(8px)',
            border: interested ? '1px solid rgba(236,72,153,.5)' : '1px solid rgba(255,255,255,.15)',
          }}
        >
          <span className="text-sm">{interested ? '❤️' : '🤍'}</span>
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-slate-100 truncate">{auction.title}</h3>

        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider" style={{ color: '#64748b' }}>Current Bid</p>
            <p className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              {formatINR(auction.currentBid)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider" style={{ color: '#64748b' }}>
              {auction.status === 'upcoming' ? 'Starts In' : 'Time Left'}
            </p>
            <p className={`text-sm font-bold ${timerStyle.animation}`} style={{ color: timerStyle.color }}>
              {timerStyle.flash ? '🔴 ' : ''}{timeDisplay}
            </p>
          </div>
        </div>

        {/* Bid info */}
        <div className="mt-3 flex items-center justify-between text-xs" style={{ color: '#64748b' }}>
          <span>{auction.totalBids || 0} bids</span>
          {interestedCount > 0 && (
            <span className="text-pink-400">❤️ {interestedCount}</span>
          )}
          <span>{auction.bidders?.length || 0} bidders</span>
        </div>

        {/* Button */}
        <div className="mt-3">
          {auction.status === 'live' ? (
            <div className="w-full py-2.5 text-white text-center text-sm font-semibold rounded-xl"
              style={{ background: isBattle ? 'linear-gradient(135deg,#ef4444,#f97316)' : 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
              {isBattle ? '⚔️ Join Battle' : 'Place Bid'}
            </div>
          ) : auction.status === 'upcoming' ? (
            <div className="w-full py-2.5 text-center text-sm font-semibold rounded-xl"
              style={{ background: 'rgba(56,189,248,.1)', color: '#38bdf8' }}>
              🔵 Starting Soon
            </div>
          ) : (
            <div className="w-full py-2.5 text-center text-sm font-semibold rounded-xl"
              style={{ background: 'rgba(255,255,255,.05)', color: '#64748b' }}>
              Auction Ended
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
