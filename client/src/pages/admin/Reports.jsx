import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { formatINR } from '../../utils/helpers';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';

const CHART_COLORS = { primary: '#a78bfa', secondary: '#22d3ee', bar: '#7c3aed' };

function DarkTooltip({ active, payload, label, formatValue }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(6,5,26,.92)', border: '1px solid rgba(124,58,237,.3)', borderRadius: 10, padding: '8px 14px', fontSize: 13 }}>
      <p style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color, fontWeight: 700 }}>
          {p.name}: {formatValue ? formatValue(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

export default function Reports() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/admin/reports').then(({ data }) => setData(data));
  }, []);

  if (!data) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-100 mb-8 fu1">📊 Reports & Analytics</h1>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 fu2">
        <div className="stat-card text-center">
          <p className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">{data.totalAuctions}</p>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>Total Auctions</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">{data.totalBids}</p>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>Total Bids</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">{data.endedAuctions}</p>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>Completed Auctions</p>
        </div>
      </div>

      {/* Revenue Over Time */}
      <div className="glass-card p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-100 mb-5">📈 Revenue Over Time (Last 14 Days)</h2>
        {data.revenueChart?.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.revenueChart} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<DarkTooltip formatValue={(v) => formatINR(v)} />} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke={CHART_COLORS.primary} strokeWidth={2.5} dot={{ r: 3, fill: CHART_COLORS.primary }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="auctions" name="Auctions Ended" stroke={CHART_COLORS.secondary} strokeWidth={2} strokeDasharray="5 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center py-10 text-sm" style={{ color: '#4b5563' }}>No completed auction data yet.</p>
        )}
      </div>

      {/* Bids Per Auction */}
      <div className="glass-card p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-100 mb-5">🔥 Bids Per Auction (Top 8)</h2>
        {data.bidsPerAuction?.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.bidsPerAuction} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" vertical={false} />
              <XAxis dataKey="auction" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<DarkTooltip />} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              <Bar dataKey="bids" name="Total Bids" fill={CHART_COLORS.bar} radius={[6, 6, 0, 0]} maxBarSize={56} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center py-10 text-sm" style={{ color: '#4b5563' }}>No bid data yet.</p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6 fu3">
        {/* Top Bidders */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold text-slate-100 mb-4">🏆 Top Bidders</h2>
          <div className="space-y-3">
            {data.topBidders.map((b, i) => (
              <div key={b._id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                  <span className="font-medium text-slate-200">{b.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-100">{b.totalBids} bids</p>
                  <p className="text-xs" style={{ color: '#4b5563' }}>{formatINR(b.totalAmount)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Auctions */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold text-slate-100 mb-4">🔥 Most Active Auctions</h2>
          <div className="space-y-3">
            {data.topAuctions.map((a) => (
              <div key={a._id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                <div>
                  <p className="font-medium text-slate-200">{a.title}</p>
                  <p className="text-xs capitalize" style={{ color: '#4b5563' }}>{a.status}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-100">{formatINR(a.currentBid)}</p>
                  <p className="text-xs" style={{ color: '#4b5563' }}>{a.totalBids} bids</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
