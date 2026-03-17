import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../utils/helpers';

export default function Wallet() {
  const { user, refreshUser } = useAuth();
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    refreshUser();
    api.get('/wallet').then(({ data }) => setWallet(data));
  }, []);

  if (!wallet) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-100 mb-8 fu1">💰 Wallet</h1>

      {/* Credit Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 fu2">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
          <p className="text-sm opacity-80">Available Credits</p>
          <p className="text-3xl font-bold mt-2">{formatINR(wallet.available)}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white">
          <p className="text-sm opacity-80">Locked in Auctions</p>
          <p className="text-3xl font-bold mt-2">{formatINR(wallet.lockedCredits)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-600 to-cyan-500 rounded-2xl p-6 text-white">
          <p className="text-sm opacity-80">Total Credits</p>
          <p className="text-3xl font-bold mt-2">{formatINR(wallet.credits)}</p>
        </div>
      </div>

      {/* Transactions */}
      <div className="glass p-6 fu3">
        <h2 className="text-lg font-bold text-slate-100 mb-4">Transaction History</h2>
        {wallet.transactions.length === 0 ? (
          <p style={{ color: '#4b5563' }}>No transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="dark-table">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                  <th className="text-left text-xs uppercase pb-3" style={{ color: '#64748b' }}>Type</th>
                  <th className="text-left text-xs uppercase pb-3" style={{ color: '#64748b' }}>Amount</th>
                  <th className="text-left text-xs uppercase pb-3" style={{ color: '#64748b' }}>Reason</th>
                  <th className="text-left text-xs uppercase pb-3" style={{ color: '#64748b' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {wallet.transactions.map((t) => (
                  <tr key={t._id} style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                    <td className="py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        t.type === 'assign' || t.type === 'refund' || t.type === 'bid_unlock'
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`} style={{ background: 'rgba(255,255,255,.06)' }}>
                        {t.type}
                      </span>
                    </td>
                    <td className="py-3 font-medium text-slate-100">{formatINR(t.amount)}</td>
                    <td className="py-3 text-sm" style={{ color: '#94a3b8' }}>{t.reason}</td>
                    <td className="py-3 text-sm" style={{ color: '#4b5563' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
