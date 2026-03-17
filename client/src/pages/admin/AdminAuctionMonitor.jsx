import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import { formatINR, getTimeLeft, getTimeTo, getHeatEmoji, getHeatColor, getStatusColor } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function AdminAuctionMonitor() {
  const { id } = useParams();
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activity, setActivity] = useState([]);
  const [timeDisplay, setTimeDisplay] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/auctions/${id}`);
        setAuction(data.auction);
        setBids(data.bids);
        setMessages(data.messages);
        setLoading(false);
      } catch { setLoading(false); }
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!auction) return;
    const socket = getSocket();
    if (!socket) return;
    socket.emit('joinAuction', id);

    socket.on('bidUpdated', (data) => {
      setAuction((p) => ({ ...p, currentBid: data.currentBid, highestBidder: data.highestBidder, totalBids: data.totalBids, endTime: data.endTime, heatLevel: data.heatLevel }));
      setBids((prev) => [{ _id: Date.now(), user: { name: data.bid.userName }, amount: data.bid.amount, createdAt: data.bid.createdAt }, ...prev]);
    });
    socket.on('chatMessage', (msg) => setMessages((p) => [...p, msg]));
    socket.on('activityEvent', (e) => setActivity((p) => [...p.slice(-30), e]));
    socket.on('auctionEnded', (data) => setAuction((p) => ({ ...p, status: 'ended', winner: data.winner })));

    return () => { socket.emit('leaveAuction', id); socket.off('bidUpdated'); socket.off('chatMessage'); socket.off('activityEvent'); socket.off('auctionEnded'); };
  }, [auction?._id]);

  useEffect(() => {
    if (!auction) return;
    const update = () => {
      if (auction.status === 'upcoming') setTimeDisplay(getTimeTo(auction.startTime).text || 'Soon');
      else if (auction.status === 'live') { const t = getTimeLeft(auction.endTime); setTimeDisplay(t.seconds <= 0 ? 'Ending...' : t.text); }
      else setTimeDisplay('Ended');
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [auction?.status, auction?.startTime, auction?.endTime]);

  const closeAuction = async () => {
    if (!window.confirm('Close this auction and declare winner?')) return;
    try {
      await api.post(`/admin/auctions/${id}/close`);
      toast.success('Auction closed');
      setAuction((p) => ({ ...p, status: 'ended' }));
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;
  if (!auction) return <div className="text-center py-20" style={{ color: '#4b5563' }}>Auction not found</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6 fu1">
        <div>
          <Link to="/admin/auctions" className="text-sm text-purple-400 hover:underline">← Back to Manage</Link>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">{auction.title}</h1>
        </div>
        {auction.status === 'live' && (
          <button onClick={closeAuction} className="px-6 py-2 rounded-xl font-medium text-white" style={{ background: 'rgba(239,68,68,.8)' }}>
            Close Auction
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-6 fu2">
        <div className="stat-card text-center">
          <p className="text-xs" style={{ color: '#64748b' }}>Status</p>
          <span className={`text-lg font-bold ${getStatusColor(auction.status)} text-white px-3 py-1 rounded-full inline-block mt-1`}>{auction.status.toUpperCase()}</span>
        </div>
        <div className="stat-card text-center">
          <p className="text-xs" style={{ color: '#64748b' }}>Current Bid</p>
          <p className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">{formatINR(auction.currentBid)}</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-xs" style={{ color: '#64748b' }}>Time</p>
          <p className="text-2xl font-bold text-slate-100">{timeDisplay}</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-xs" style={{ color: '#64748b' }}>Heat</p>
          <p className={`text-2xl font-bold ${getHeatColor(auction.heatLevel)}`}>{getHeatEmoji(auction.heatLevel)} {auction.heatLevel}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 fu3">
        {/* Bid History */}
        <div className="glass-card p-6">
          <h3 className="font-bold text-slate-100 mb-4">Bids ({bids.length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {bids.map((b, i) => (
              <div key={b._id} className={`flex justify-between py-2 px-3 rounded-lg text-sm ${i === 0 ? 'font-bold text-purple-300' : 'text-slate-300'}`} style={i === 0 ? { background: 'rgba(124,58,237,.12)' } : {}}>
                <span>{b.user?.name}</span><span>{formatINR(b.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Log */}
        <div className="glass-card p-6">
          <h3 className="font-bold text-slate-100 mb-4">Chat Log ({messages.length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {messages.map((m, i) => (
              <div key={m._id || i} className="text-sm">
                {m.type === 'system' || m.type === 'bid' ? (
                  <p className="text-xs" style={{ color: '#4b5563' }}>{m.text}</p>
                ) : (
                  <p><span className="font-bold text-slate-300">{m.userName}:</span> <span style={{ color: '#94a3b8' }}>{m.text}</span></p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="glass-card p-6">
          <h3 className="font-bold text-slate-100 mb-4">Activity Feed</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {activity.length === 0 ? <p className="text-xs" style={{ color: '#4b5563' }}>No activity yet</p> : (
              activity.map((e, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${e.type === 'bid' ? 'bg-green-500' : 'bg-blue-500'}`} />
                  <span style={{ color: '#94a3b8' }}>{e.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
