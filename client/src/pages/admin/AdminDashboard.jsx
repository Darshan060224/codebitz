import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { formatINR } from '../../utils/helpers';
import { BoltStatIcon, PeopleIcon, GavelIcon, BoxIcon, RocketIcon, ScrollIcon, PeopleGroupIcon, ReportIcon, TrophyIcon, MoneyBagIcon } from '../../components/Icons';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/admin/stats').then(({ data }) => setStats(data));
  }, []);

  if (!stats) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  const cards = [
    { label: 'Active Auctions', value: stats.activeAuctions, icon: <GavelIcon size={48} />, gradient: 'from-red-400 to-pink-500' },
    { label: 'Total Auctions', value: stats.totalAuctions, icon: <BoxIcon />, gradient: 'from-purple-500 to-indigo-500' },
    { label: 'Total Bids', value: stats.totalBids, icon: <BoltStatIcon />, gradient: 'from-cyan-400 to-blue-500' },
    { label: 'Total Users', value: stats.totalUsers, icon: <PeopleIcon />, gradient: 'from-green-400 to-emerald-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between fu1">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Admin Dashboard</h1>
          <p style={{ color: '#64748b' }} className="mt-1">Platform overview and management</p>
        </div>
        <Link to="/admin/create-auction" className="btn-gradient">+ Create Auction</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 fu2">
        {cards.map((c) => (
          <div key={c.label} className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider" style={{ color: '#64748b' }}>{c.label}</p>
                <p className={`text-3xl font-bold mt-1 bg-gradient-to-r ${c.gradient} bg-clip-text text-transparent`}>
                  {c.value}
                </p>
              </div>
              <div className="opacity-80">{c.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Info */}
      <div className="grid md:grid-cols-2 gap-6 fu3">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrophyIcon />
            <h3 className="text-lg font-bold text-slate-100">Top Bidder</h3>
          </div>
          <p className="text-2xl font-bold text-purple-400">{stats.topBidderName}</p>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <MoneyBagIcon />
            <h3 className="text-lg font-bold text-slate-100">Highest Auction</h3>
          </div>
          {stats.highestAuction ? (
            <>
              <p className="text-lg font-medium text-slate-200">{stats.highestAuction.title}</p>
              <p className="text-2xl font-bold text-cyan-400">{formatINR(stats.highestAuction.bid)}</p>
            </>
          ) : (
            <p style={{ color: '#4b5563' }}>No auctions yet</p>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 fu4">
        {[
          { label: 'Create Auction', to: '/admin/create-auction', icon: <RocketIcon /> },
          { label: 'Manage Auctions', to: '/admin/auctions', icon: <ScrollIcon /> },
          { label: 'Manage Users', to: '/admin/users', icon: <PeopleGroupIcon /> },
          { label: 'Reports', to: '/admin/reports', icon: <ReportIcon /> },
        ].map((l) => (
          <Link key={l.to} to={l.to} className="glass-card p-6 text-center">
            <div className="flex justify-center mb-2">{l.icon}</div>
            <p className="mt-2 text-sm font-medium text-slate-300">{l.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
