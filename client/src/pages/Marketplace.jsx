import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import AuctionCard from '../components/AuctionCard';
import { getSocket } from '../utils/socket';

export default function Marketplace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || '');
  const socketRef = useRef(null);

  // Sync filters to URL so back-navigation restores state
  useEffect(() => {
    const params = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (categoryFilter) params.category = categoryFilter;
    if (sort) params.sort = sort;
    setSearchParams(params, { replace: true });
  }, [search, statusFilter, categoryFilter, sort]);

  const fetchAuctions = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (sort) params.sort = sort;
      const { data } = await api.get('/auctions', { params });
      setAuctions(data.auctions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctions();
    // Reduced polling interval — socket handles live updates, poll catches status changes
    const interval = setInterval(fetchAuctions, 30000);
    return () => clearInterval(interval);
  }, [search, statusFilter, categoryFilter, sort]);

  // Real-time socket updates — patch individual auction cards without full refetch
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socketRef.current = socket;
    socket.emit('joinMarketplace');

    const handleUpdate = ({ auctionId, currentBid, totalBids, heatLevel, endTime }) => {
      setAuctions((prev) =>
        prev.map((a) =>
          a._id === auctionId
            ? { ...a, currentBid, totalBids, heatLevel, endTime }
            : a
        )
      );
    };

    socket.on('marketplaceUpdate', handleUpdate);
    return () => {
      socket.emit('leaveMarketplace');
      socket.off('marketplaceUpdate', handleUpdate);
    };
  }, []);

  const categories = [...new Set(auctions.map((a) => a.category))];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 fu1">
        <h1 className="text-3xl font-bold text-slate-100">Auction Marketplace</h1>
        <p className="mt-1" style={{ color: '#64748b' }}>Browse and bid on live auctions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8 fu2">
        <input
          type="text"
          placeholder="Search auctions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="dark-input w-64 text-sm"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="dark-select">
          <option value="">All Status</option>
          <option value="live">Live</option>
          <option value="upcoming">Upcoming</option>
          <option value="ended">Ended</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="dark-select">
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="dark-select">
          <option value="">Newest</option>
          <option value="ending">Ending Soon</option>
          <option value="bids">Most Bids</option>
        </select>
      </div>

      {/* Trending section */}
      {auctions.filter((a) => a.heatLevel === 'hot').length > 0 && (
        <div className="mb-8 fu3">
          <h2 className="text-xl font-bold text-slate-100 mb-4">🔥 Trending Auctions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {auctions.filter((a) => a.heatLevel === 'hot').map((auction) => (
              <AuctionCard key={auction._id} auction={auction} />
            ))}
          </div>
        </div>
      )}

      {/* All auctions */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : auctions.length === 0 ? (
        <div className="text-center py-20" style={{ color: '#4b5563' }}>
          <p className="text-4xl mb-4">🔍</p>
          <p>No auctions found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {auctions.map((auction) => (
            <AuctionCard key={auction._id} auction={auction} />
          ))}
        </div>
      )}
    </div>
  );
}
