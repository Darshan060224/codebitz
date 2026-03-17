import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { formatINR } from '../../utils/helpers';

export default function BidHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/bids/history').then(({ data }) => {
      setHistory(data.history);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-100 mb-8 fu1">📜 Bid History</h1>

      {history.length === 0 ? (
        <div className="text-center py-20" style={{ color: '#4b5563' }}>
          <p className="text-4xl mb-4">🏷️</p>
          <p>No bids placed yet</p>
          <Link to="/auctions" className="text-purple-400 text-sm mt-2 inline-block hover:underline">Browse auctions →</Link>
        </div>
      ) : (
        <div className="glass overflow-hidden fu2">
          <table className="dark-table">
            <thead>
              <tr>
                <th className="text-left text-xs uppercase p-4" style={{ color: '#64748b' }}>Auction</th>
                <th className="text-left text-xs uppercase p-4" style={{ color: '#64748b' }}>Your Bid</th>
                <th className="text-left text-xs uppercase p-4" style={{ color: '#64748b' }}>Status</th>
                <th className="text-left text-xs uppercase p-4" style={{ color: '#64748b' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {history.map((b) => (
                <tr key={b._id} style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                  <td className="p-4">
                    <Link to={`/auction/${b.auctionId}`} className="flex items-center gap-3">
                      <img src={b.auctionImage} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      <span className="text-sm font-medium text-slate-200 hover:text-purple-400">{b.auctionTitle}</span>
                    </Link>
                  </td>
                  <td className="p-4 font-bold text-slate-100">{formatINR(b.amount)}</td>
                  <td className="p-4">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      b.status === 'Winning' ? 'text-green-400' :
                      b.status === 'Won' ? 'text-emerald-400' :
                      b.status === 'Lost' ? 'text-red-400' :
                      'text-yellow-400'
                    }`} style={{ background: 'rgba(255,255,255,.06)' }}>
                      {b.status === 'Winning' ? '🏆 ' : b.status === 'Won' ? '🎉 ' : b.status === 'Lost' ? '❌ ' : '⚠️ '}
                      {b.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm" style={{ color: '#4b5563' }}>{new Date(b.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
