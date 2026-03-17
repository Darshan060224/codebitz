import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { formatINR, getStatusColor } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function ManageAuctions() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAuctions = async () => {
    const { data } = await api.get('/auctions');
    setAuctions(data.auctions);
    setLoading(false);
  };

  useEffect(() => { fetchAuctions(); }, []);

  const closeAuction = async (id) => {
    if (!confirm('Close this auction and declare winner?')) return;
    try {
      await api.post(`/admin/auctions/${id}/close`);
      toast.success('Auction closed!');
      fetchAuctions();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const deleteAuction = async (id) => {
    if (!confirm('Delete this auction? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/auctions/${id}`);
      toast.success('Auction deleted');
      fetchAuctions();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8 fu1">
        <h1 className="text-3xl font-bold text-slate-100">📋 Manage Auctions</h1>
        <Link to="/admin/create-auction" className="btn-gradient">+ Create</Link>
      </div>

      <div className="glass overflow-hidden fu2">
        <table className="dark-table">
          <thead>
            <tr>
              <th className="text-left text-xs uppercase p-4" style={{ color: '#64748b' }}>Auction</th>
              <th className="text-left text-xs uppercase p-4" style={{ color: '#64748b' }}>Current Bid</th>
              <th className="text-left text-xs uppercase p-4" style={{ color: '#64748b' }}>Bids</th>
              <th className="text-left text-xs uppercase p-4" style={{ color: '#64748b' }}>Status</th>
              <th className="text-left text-xs uppercase p-4" style={{ color: '#64748b' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {auctions.map((a) => (
              <tr key={a._id} style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <img src={a.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    <div>
                      <p className="text-sm font-medium text-slate-200">{a.title}</p>
                      <p className="text-xs" style={{ color: '#4b5563' }}>{a.category}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 font-bold text-slate-100">{formatINR(a.currentBid)}</td>
                <td className="p-4 text-sm" style={{ color: '#94a3b8' }}>{a.totalBids}</td>
                <td className="p-4">
                  <span className={`${getStatusColor(a.status)} text-white text-xs font-bold px-3 py-1 rounded-full uppercase`}>
                    {a.status}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <Link to={`/auction/${a._id}`} className="px-3 py-1 text-xs rounded-lg font-medium" style={{ background: 'rgba(59,130,246,.15)', color: '#60a5fa' }}>
                      View
                    </Link>
                    {a.status === 'live' && (
                      <button onClick={() => closeAuction(a._id)} className="px-3 py-1 text-xs rounded-lg font-medium" style={{ background: 'rgba(249,115,22,.15)', color: '#fb923c' }}>
                        Close
                      </button>
                    )}
                    <button onClick={() => deleteAuction(a._id)} className="px-3 py-1 text-xs rounded-lg font-medium" style={{ background: 'rgba(239,68,68,.15)', color: '#f87171' }}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
