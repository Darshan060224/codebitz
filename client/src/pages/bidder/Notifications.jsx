import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/wallet/notifications').then(({ data }) => {
      setNotifications(data.notifications);
      setLoading(false);
    });
  }, []);

  const markRead = async (id) => {
    await api.patch(`/wallet/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
  };

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  const icons = { outbid: '⚠️', winning: '🏆', auction_ending: '⏳', auction_won: '🎉', auction_lost: '❌', credits: '💰', system: '🔔' };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-100 mb-8 fu1">🔔 Notifications</h1>

      {notifications.length === 0 ? (
        <div className="text-center py-20" style={{ color: '#4b5563' }}>
          <p className="text-4xl mb-4">🔕</p>
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-3 fu2">
          {notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => !n.read && markRead(n._id)}
              className="glass-card p-4 cursor-pointer transition-all"
              style={n.read ? { opacity: 0.5 } : { borderColor: 'rgba(124,58,237,.3)', background: 'rgba(124,58,237,.08)' }}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{icons[n.type] || '🔔'}</span>
                <div className="flex-1">
                  <p className="font-semibold text-slate-100">{n.title}</p>
                  <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>{n.message}</p>
                  <p className="text-xs mt-2" style={{ color: '#4b5563' }}>{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.read && <span className="w-2 h-2 bg-purple-500 rounded-full mt-2" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
